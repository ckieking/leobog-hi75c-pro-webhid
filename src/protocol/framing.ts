import {
  BODY_LENGTH,
  CHECKSUM_INDEX,
  ERROR_BIT,
  FULL_FRAME_LENGTH,
  PACKET_PAYLOAD_SIZE,
  REPORT_ID,
} from "./constants.ts";

export interface ParsedPacket {
  cmd: number;
  packetCount: number;
  sub: number;
  hasError: boolean;
  pktIdx: number;
  len: number;
  payload: Uint8Array;
  checksum: number;
  rawBody: Uint8Array;
}

/**
 * Computes the 8-bit checksum for a 19-byte WebHID body (Report ID 0x13 omitted).
 * Checksum = (0x13 + sum(body19[0..17])) & 0xFF.
 */
export function computeChecksum(body19: Uint8Array): number {
  let sum = REPORT_ID;
  const limit = Math.min(CHECKSUM_INDEX, body19.length);
  for (let i = 0; i < limit; i++) {
    sum += body19[i];
  }
  return sum & 0xff;
}

/**
 * Verifies a 19-byte WebHID body (without leading 0x13 Report ID).
 */
export function verifyChecksum(body19: Uint8Array): boolean {
  if (body19.length !== BODY_LENGTH) {
    return false;
  }
  return body19[CHECKSUM_INDEX] === computeChecksum(body19);
}

/**
 * Verifies a full 20-byte frame (including leading 0x13 Report ID at byte 0).
 */
export function verifyFullFrameChecksum(frame20: Uint8Array): boolean {
  if (frame20.length !== FULL_FRAME_LENGTH || frame20[0] !== REPORT_ID) {
    return false;
  }
  return verifyChecksum(frame20.subarray(1));
}

/**
 * Encodes a single 19-byte WebHID report body for `device.sendReport(0x13, body19)`.
 */
export function encodePacket(
  cmd: number,
  sub: number,
  pktIdx: number,
  payload?: Uint8Array,
  packetCount = 1,
): Uint8Array {
  const body = new Uint8Array(BODY_LENGTH);
  const len = payload ? Math.min(PACKET_PAYLOAD_SIZE, payload.length) : 0;
  body[0] = cmd & 0xff;
  body[1] = packetCount & 0xff;
  body[2] = pktIdx & 0xff;
  body[3] = ((sub & 0x0f) << 4) | (len & 0x0f);
  if (payload && len > 0) {
    body.set(payload.subarray(0, len), 4);
  }
  body[CHECKSUM_INDEX] = computeChecksum(body);
  return body;
}

/**
 * Splits an arbitrary payload into 14-byte chunks and encodes each into a 19-byte body.
 */
export function encodePackets(cmd: number, sub: number, data: Uint8Array): Uint8Array[] {
  if (data.length === 0) {
    return [encodePacket(cmd, sub, 0, undefined, 1)];
  }
  const packetCount = Math.ceil(data.length / PACKET_PAYLOAD_SIZE);
  const packets: Uint8Array[] = [];
  for (let i = 0; i < packetCount; i++) {
    const start = i * PACKET_PAYLOAD_SIZE;
    const end = Math.min(start + PACKET_PAYLOAD_SIZE, data.length);
    packets.push(encodePacket(cmd, sub, i, data.subarray(start, end), packetCount));
  }
  return packets;
}

/**
 * Parses and validates a 19-byte WebHID inputreport body.
 * Returns null if length, checksum, or payload length is invalid.
 */
export function decodePacket(body19: Uint8Array): ParsedPacket | null {
  if (!verifyChecksum(body19)) {
    return null;
  }
  const rawCount = body19[1];
  const hasError = (rawCount & ERROR_BIT) !== 0;
  const packetCount = rawCount & ~ERROR_BIT;
  const sub = (body19[3] >> 4) & 0x0f;
  const len = body19[3] & 0x0f;
  if (len > PACKET_PAYLOAD_SIZE) {
    return null;
  }
  return {
    cmd: body19[0],
    packetCount,
    sub,
    hasError,
    pktIdx: body19[2],
    len,
    payload: body19.slice(4, 4 + len),
    checksum: body19[CHECKSUM_INDEX],
    rawBody: body19.slice(),
  };
}

/**
 * Reassembles out-of-order packets by `pktIdx`, discarding error packets.
 * Returns null if required packets are missing or assembled length is insufficient.
 */
export function reassemblePackets(
  packets: readonly ParsedPacket[],
  expectedCmd: number,
  expectedLength?: number,
): Uint8Array | null {
  const byIndex = new Map<number, ParsedPacket>();
  let maxIdx = -1;

  for (const pkt of packets) {
    if (pkt.cmd !== expectedCmd || pkt.hasError) {
      continue;
    }
    if (!byIndex.has(pkt.pktIdx)) {
      byIndex.set(pkt.pktIdx, pkt);
      if (pkt.pktIdx > maxIdx) {
        maxIdx = pkt.pktIdx;
      }
    }
  }

  const requiredCount =
    expectedLength !== undefined
      ? Math.max(1, Math.ceil(expectedLength / PACKET_PAYLOAD_SIZE))
      : maxIdx + 1;

  if (requiredCount <= 0 || byIndex.size < requiredCount) {
    return null;
  }

  let totalBytes = 0;
  for (let idx = 0; idx < requiredCount; idx++) {
    const pkt = byIndex.get(idx);
    if (!pkt) {
      return null;
    }
    totalBytes += pkt.len;
  }

  if (expectedLength !== undefined && totalBytes < expectedLength) {
    return null;
  }

  const out = new Uint8Array(totalBytes);
  let offset = 0;
  for (let idx = 0; idx < requiredCount; idx++) {
    const pkt = byIndex.get(idx)!;
    out.set(pkt.payload, offset);
    offset += pkt.len;
  }

  return expectedLength !== undefined ? out.subarray(0, expectedLength) : out;
}
