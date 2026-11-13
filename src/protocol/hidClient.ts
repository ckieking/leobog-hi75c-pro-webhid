import {
  CMD,
  CFG_SIZE,
  HID_FILTERS,
  KEYMAP_SIZE,
  PALETTE_SIZE,
  POST_WRITE_SETTLE_MS,
  PRODUCT_ID,
  READ_MAX_ATTEMPTS,
  READ_TIMEOUT_MS,
  REPORT_ID,
  RGB_SIZE,
  USAGE,
  USAGE_PAGE,
  VENDOR_ID,
  WRITE_INTER_PACKET_GAP_MS,
  type KeymapLayer,
} from "./constants.ts";
import {
  decodeBattery,
  decodeConfig,
  decodeKeymap,
  decodePalette,
  decodeRgbMap,
  encodeConfig,
  encodeKeymap,
  encodePalette,
  encodeRgbMap,
  type BatteryStatus,
  type DeviceConfig,
  type KeyEntry,
  type PaletteData,
  type RgbColor,
} from "./codecs.ts";
import {
  decodePacket,
  encodePacket,
  encodePackets,
  reassemblePackets,
  type ParsedPacket,
} from "./framing.ts";

export class DeviceAsleepError extends Error {
  constructor(message = "Keyboard did not respond (device may be asleep)") {
    super(message);
    this.name = "DeviceAsleepError";
  }
}

export class HidProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HidProtocolError";
  }
}

export interface HidClientOptions {
  interPacketDelayMs?: number;
  postWriteSettleMs?: number;
  readTimeoutMs?: number;
  maxReadAttempts?: number;
}

export interface HidInputReportLike {
  reportId: number;
  data: DataView;
}

export interface HidDeviceLike {
  readonly opened: boolean;
  readonly vendorId: number;
  readonly productId: number;
  readonly productName?: string;
  readonly collections?: readonly HIDCollectionInfo[];
  open(): Promise<void>;
  close(): Promise<void>;
  sendReport(reportId: number, data: BufferSource): Promise<void>;
  addEventListener(type: "inputreport", listener: (ev: HidInputReportLike) => void): void;
  removeEventListener(type: "inputreport", listener: (ev: HidInputReportLike) => void): void;
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function dataViewToUint8Array(view: DataView): Uint8Array {
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}

export function isWebHidSupported(): boolean {
  return typeof navigator !== "undefined" && "hid" in navigator && navigator.hid != null;
}

export function isMatchingHi75cInterface(device: HidDeviceLike): boolean {
  if (device.vendorId !== VENDOR_ID || device.productId !== PRODUCT_ID) {
    return false;
  }
  if (!device.collections || device.collections.length === 0) {
    return true;
  }
  return device.collections.some(
    (col) => col.usagePage === USAGE_PAGE && col.usage === USAGE,
  );
}

export async function getConnectedHi75cDevices(): Promise<HIDDevice[]> {
  if (!isWebHidSupported()) {
    return [];
  }
  const devices = await navigator.hid.getDevices();
  return devices.filter((d) => isMatchingHi75cInterface(d));
}

export async function requestHi75cDevice(): Promise<HIDDevice | null> {
  if (!isWebHidSupported()) {
    throw new HidProtocolError("WebHID is not supported in this browser");
  }
  const devices = await navigator.hid.requestDevice({ filters: HID_FILTERS });
  const match = devices.find((d) => isMatchingHi75cInterface(d));
  return match ?? devices[0] ?? null;
}

export class HidClient {
  private readonly device: HidDeviceLike;
  private readonly interPacketDelayMs: number;
  private readonly postWriteSettleMs: number;
  private readonly readTimeoutMs: number;
  private readonly maxReadAttempts: number;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(device: HidDeviceLike, options: HidClientOptions = {}) {
    this.device = device;
    this.interPacketDelayMs = options.interPacketDelayMs ?? WRITE_INTER_PACKET_GAP_MS;
    this.postWriteSettleMs = options.postWriteSettleMs ?? POST_WRITE_SETTLE_MS;
    this.readTimeoutMs = options.readTimeoutMs ?? READ_TIMEOUT_MS;
    this.maxReadAttempts = options.maxReadAttempts ?? READ_MAX_ATTEMPTS;
  }

  async open(): Promise<void> {
    if (!this.device.opened) {
      await this.device.open();
    }
  }

  async close(): Promise<void> {
    if (this.device.opened) {
      await this.device.close();
    }
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const next = this.queue.then(task, task);
    this.queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  private async ensureOpen(): Promise<void> {
    if (!this.device.opened) {
      await this.device.open();
    }
  }

  private waitForReport(
    predicate: (pkt: ParsedPacket) => boolean,
    timeoutMs: number,
  ): Promise<ParsedPacket | null> {
    return new Promise((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          this.device.removeEventListener("inputreport", onReport);
          resolve(null);
        }
      }, timeoutMs);

      const onReport = (ev: HidInputReportLike) => {
        if (settled || ev.reportId !== REPORT_ID) {
          return;
        }
        const parsed = decodePacket(dataViewToUint8Array(ev.data));
        if (!parsed || parsed.hasError || !predicate(parsed)) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        this.device.removeEventListener("inputreport", onReport);
        resolve(parsed);
      };

      this.device.addEventListener("inputreport", onReport);
    });
  }

  private collectReadAttempt(
    cmd: number,
    sub: number,
    expectedLength: number | undefined,
    collected: ParsedPacket[],
  ): Promise<Uint8Array | null> {
    return new Promise((resolve) => {
      let settled = false;

      const finish = (result: Uint8Array | null) => {
        if (!settled) {
          settled = true;
          clearTimeout(idleTimer);
          this.device.removeEventListener("inputreport", onReport);
          resolve(result);
        }
      };

      let idleTimer = setTimeout(() => {
        finish(reassemblePackets(collected, cmd, expectedLength));
      }, this.readTimeoutMs);

      const resetIdle = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          finish(reassemblePackets(collected, cmd, expectedLength));
        }, this.readTimeoutMs);
      };

      const onReport = (ev: HidInputReportLike) => {
        if (settled || ev.reportId !== REPORT_ID) {
          return;
        }
        const parsed = decodePacket(dataViewToUint8Array(ev.data));
        if (!parsed || parsed.hasError || parsed.cmd !== cmd) {
          return;
        }
        collected.push(parsed);
        const assembled = reassemblePackets(collected, cmd, expectedLength);
        if (assembled) {
          finish(assembled);
          return;
        }
        resetIdle();
      };

      this.device.addEventListener("inputreport", onReport);
      const req = encodePacket(cmd, sub, 0);
      this.device.sendReport(REPORT_ID, req as Uint8Array<ArrayBuffer>).catch(() => {
        finish(null);
      });
    });
  }

  async readRaw(cmd: number, sub = 0, expectedLength?: number): Promise<Uint8Array> {
    return this.enqueue(async () => {
      await this.ensureOpen();
      const collected: ParsedPacket[] = [];

      for (let attempt = 0; attempt < this.maxReadAttempts; attempt++) {
        const result = await this.collectReadAttempt(cmd, sub, expectedLength, collected);
        if (result) {
          return result;
        }
      }

      if (collected.length === 0) {
        throw new DeviceAsleepError();
      }
      throw new HidProtocolError(
        `Incomplete response for cmd 0x${cmd.toString(16)} (${collected.length} packets received)`,
      );
    });
  }

  async writeRaw(cmd: number, sub: number, data: Uint8Array): Promise<void> {
    return this.enqueue(async () => {
      await this.ensureOpen();
      const packets = encodePackets(cmd, sub, data);

      for (let i = 0; i < packets.length; i++) {
        const packet = packets[i];
        let acked = false;

        for (let attempt = 0; attempt < this.maxReadAttempts; attempt++) {
          const ackPromise = this.waitForReport(
            (pkt) => pkt.cmd === cmd && pkt.pktIdx === i,
            this.readTimeoutMs,
          );
          await this.device.sendReport(REPORT_ID, packet as Uint8Array<ArrayBuffer>);
          const ack = await ackPromise;
          if (ack) {
            acked = true;
            break;
          }
        }

        if (!acked) {
          throw new DeviceAsleepError(
            `No ACK for write cmd 0x${cmd.toString(16)} packet ${i}`,
          );
        }

        if (i < packets.length - 1) {
          await delay(this.interPacketDelayMs);
        }
      }

      await delay(this.postWriteSettleMs);
    });
  }

  async readPsd(): Promise<Uint8Array> {
    return this.readRaw(CMD.PSD, 0);
  }

  async readBattery(): Promise<BatteryStatus> {
    const payload = await this.readRaw(CMD.BATTERY, 0, 2);
    return decodeBattery(payload);
  }

  async readConfig(): Promise<DeviceConfig> {
    const raw = await this.readRaw(CMD.READ_CFG, 0, CFG_SIZE);
    return decodeConfig(raw);
  }

  async writeConfig(config: DeviceConfig): Promise<void> {
    const raw = encodeConfig(config);
    await this.writeRaw(CMD.WRITE_CFG, 0, raw);
  }

  async readKeymap(layer: KeymapLayer): Promise<KeyEntry[]> {
    const raw = await this.readRaw(CMD.READ_KEYMAP, layer, KEYMAP_SIZE);
    return decodeKeymap(raw);
  }

  async writeKeymap(layer: KeymapLayer, entries: readonly KeyEntry[]): Promise<void> {
    const raw = encodeKeymap(entries);
    await this.writeRaw(CMD.WRITE_KEYMAP, layer, raw);
  }

  async readRgbMap(): Promise<RgbColor[]> {
    const raw = await this.readRaw(CMD.READ_RGB, 0, RGB_SIZE);
    return decodeRgbMap(raw);
  }

  async writeRgbMap(colors: readonly RgbColor[]): Promise<void> {
    const raw = encodeRgbMap(colors);
    await this.writeRaw(CMD.WRITE_RGB, 0, raw);
  }

  async readPalette(): Promise<PaletteData> {
    const raw = await this.readRaw(CMD.READ_PALETTE, 0, PALETTE_SIZE);
    return decodePalette(raw);
  }

  async writePalette(palette: PaletteData): Promise<void> {
    const raw = encodePalette(palette);
    await this.writeRaw(CMD.WRITE_PALETTE, 0, raw);
  }
}
