import { describe, expect, it } from "vitest";
import {
  BODY_LENGTH,
  CMD,
  ERROR_BIT,
  REPORT_ID,
} from "../src/protocol/constants.ts";
import {
  computeChecksum,
  decodePacket,
  encodePacket,
  encodePackets,
  reassemblePackets,
  verifyChecksum,
  verifyFullFrameChecksum,
} from "../src/protocol/framing.ts";
import {
  DeviceAsleepError,
  HidClient,
  type HidDeviceLike,
  type HidInputReportLike,
} from "../src/protocol/hidClient.ts";

// Real battery response frame: 13-4A-01-00-02-64-01-00-00-00-00-00-00-00-00-00-00-00-00-C5
const REAL_BATTERY_FRAME = Uint8Array.from([
  0x13, 0x4a, 0x01, 0x00, 0x02, 0x64, 0x01, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xc5,
]);

class MockHidDevice implements HidDeviceLike {
  opened = false;
  vendorId = 0x3554;
  productId = 0xfa09;
  productName = "LEOBOG Hi75C Pro";
  sentReports: Array<{ reportId: number; data: Uint8Array }> = [];
  private listeners = new Set<(ev: HidInputReportLike) => void>();
  private onSend?: (reportId: number, body: Uint8Array, device: MockHidDevice) => void;

  constructor(onSend?: (reportId: number, body: Uint8Array, device: MockHidDevice) => void) {
    this.onSend = onSend;
  }

  async open(): Promise<void> {
    this.opened = true;
  }

  async close(): Promise<void> {
    this.opened = false;
  }

  async sendReport(reportId: number, data: BufferSource): Promise<void> {
    const view = ArrayBuffer.isView(data)
      ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
      : new Uint8Array(data);
    const copy = view.slice();
    this.sentReports.push({ reportId, data: copy });
    this.onSend?.(reportId, copy, this);
  }

  addEventListener(_type: "inputreport", listener: (ev: HidInputReportLike) => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: "inputreport", listener: (ev: HidInputReportLike) => void): void {
    this.listeners.delete(listener);
  }

  emitInputReport(body19: Uint8Array, reportId = REPORT_ID): void {
    const data = new DataView(body19.buffer, body19.byteOffset, body19.byteLength);
    for (const listener of [...this.listeners]) {
      listener({ reportId, data });
    }
  }
}

describe("framing & checksum", () => {
  it("validates the real battery vector and catches corruption at idx 0, idx 1, and checksum", () => {
    expect(verifyFullFrameChecksum(REAL_BATTERY_FRAME)).toBe(true);

    const body19 = REAL_BATTERY_FRAME.subarray(1);
    expect(body19.length).toBe(BODY_LENGTH);
    expect(verifyChecksum(body19)).toBe(true);
    expect(computeChecksum(body19)).toBe(0xc5);

    const parsed = decodePacket(body19);
    expect(parsed).not.toBeNull();
    expect(parsed?.cmd).toBe(CMD.BATTERY);
    expect(parsed?.packetCount).toBe(1);
    expect(parsed?.sub).toBe(0);
    expect(parsed?.hasError).toBe(false);
    expect(parsed?.pktIdx).toBe(0);
    expect(parsed?.len).toBe(2);
    expect(Array.from(parsed!.payload)).toEqual([0x64, 0x01]);

    // Corrupt idx 0 (Report ID) on full frame
    const corruptFullIdx0 = REAL_BATTERY_FRAME.slice();
    corruptFullIdx0[0] = 0x14;
    expect(verifyFullFrameChecksum(corruptFullIdx0)).toBe(false);

    // Corrupt idx 0 (cmd) on body19
    const corruptBodyIdx0 = body19.slice();
    corruptBodyIdx0[0] ^= 0x01;
    expect(verifyChecksum(corruptBodyIdx0)).toBe(false);
    expect(decodePacket(corruptBodyIdx0)).toBeNull();

    // Corrupt idx 1 on full frame and body19
    const corruptFullIdx1 = REAL_BATTERY_FRAME.slice();
    corruptFullIdx1[1] ^= 0x01;
    expect(verifyFullFrameChecksum(corruptFullIdx1)).toBe(false);

    const corruptBodyIdx1 = body19.slice();
    corruptBodyIdx1[1] ^= 0x01;
    expect(verifyChecksum(corruptBodyIdx1)).toBe(false);
    expect(decodePacket(corruptBodyIdx1)).toBeNull();

    // Corrupt checksum byte
    const corruptChecksum = body19.slice();
    corruptChecksum[18] ^= 0xff;
    expect(verifyChecksum(corruptChecksum)).toBe(false);
  });

  it("encodes and reassembles out-of-order packets while discarding error-bit packets", () => {
    const data = new Uint8Array(30);
    for (let i = 0; i < data.length; i++) {
      data[i] = i + 1;
    }
    const encoded = encodePackets(CMD.READ_KEYMAP, 1, data);
    expect(encoded).toHaveLength(3); // 14 + 14 + 2
    expect(encoded[0][1]).toBe(3); // packetCount
    expect(encoded[0][3]).toBe((1 << 4) | 14); // sub=1, len=14
    expect(encoded[2][3]).toBe((1 << 4) | 2); // sub=1, len=2

    const p0 = decodePacket(encoded[0])!;
    const p1 = decodePacket(encoded[1])!;
    const p2 = decodePacket(encoded[2])!;
    expect(p0.sub).toBe(1);
    expect(p0.packetCount).toBe(3);

    // Inject an error-bit packet for pktIdx 1
    const errBody = encodePacket(CMD.READ_KEYMAP, 1, 1, new Uint8Array(14), 3 | ERROR_BIT);
    const errPkt = decodePacket(errBody)!;
    expect(errPkt.hasError).toBe(true);

    // Out-of-order: p2, errPkt, p0, p1
    const reassembled = reassemblePackets([p2, errPkt, p0, p1], CMD.READ_KEYMAP, data.length);
    expect(reassembled).not.toBeNull();
    expect(Array.from(reassembled!)).toEqual(Array.from(data));

    // Dropped packet returns null
    expect(reassemblePackets([p0, p2], CMD.READ_KEYMAP, data.length)).toBeNull();
  });
});

describe("HidClient", () => {
  it("throws DeviceAsleepError when no reply arrives", async () => {
    const device = new MockHidDevice();
    const client = new HidClient(device, {
      readTimeoutMs: 10,
      maxReadAttempts: 2,
      interPacketDelayMs: 1,
      postWriteSettleMs: 1,
    });

    await expect(client.readBattery()).rejects.toBeInstanceOf(DeviceAsleepError);
    expect(device.sentReports).toHaveLength(2);
  });

  it("reassembles multi-attempt out-of-order read packets and discards corrupt/error packets", async () => {
    const payload = new Uint8Array(28);
    for (let i = 0; i < 28; i++) {
      payload[i] = (i * 3) & 0xff;
    }
    const [pkt0, pkt1] = encodePackets(CMD.READ_CFG, 0, payload);
    let attempt = 0;

    const device = new MockHidDevice((_reportId, _body, dev) => {
      attempt++;
      queueMicrotask(() => {
        if (attempt === 1) {
          // Send corrupt checksum, error packet, and pkt1 (missing pkt0)
          const badChecksum = pkt0.slice();
          badChecksum[18] ^= 0xff;
          dev.emitInputReport(badChecksum);

          const errPkt = encodePacket(CMD.READ_CFG, 0, 0, new Uint8Array(14), 2 | ERROR_BIT);
          dev.emitInputReport(errPkt);

          dev.emitInputReport(pkt1);
        } else {
          // Attempt 2 delivers pkt0
          dev.emitInputReport(pkt0);
        }
      });
    });

    const client = new HidClient(device, {
      readTimeoutMs: 20,
      maxReadAttempts: 3,
    });

    const result = await client.readRaw(CMD.READ_CFG, 0, 28);
    expect(Array.from(result)).toEqual(Array.from(payload));
  });

  it("verifies write echo ACKs and serializes concurrent operations", async () => {
    const order: string[] = [];
    const device = new MockHidDevice((_reportId, body, dev) => {
      const cmd = body[0];
      const pktIdx = body[2];
      order.push(`send:${cmd.toString(16)}:${pktIdx}`);
      queueMicrotask(() => {
        if (cmd === CMD.BATTERY) {
          dev.emitInputReport(REAL_BATTERY_FRAME.subarray(1));
        } else {
          // Echo ACK
          dev.emitInputReport(body);
        }
      });
    });

    const client = new HidClient(device, {
      interPacketDelayMs: 2,
      postWriteSettleMs: 5,
      readTimeoutMs: 50,
    });

    const writeData = new Uint8Array(20);
    const [bat] = await Promise.all([
      client.readBattery(),
      client.writeRaw(CMD.WRITE_CFG, 0, writeData),
    ]);

    expect(bat).toEqual({ percent: 100, flags: 0x01, charging: false });
    expect(order).toEqual(["send:4a:0", "send:4:0", "send:4:1"]);
  });
});
