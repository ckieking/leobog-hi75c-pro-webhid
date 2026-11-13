import {
  BATTERY_CHARGING_FLAG,
  CFG_MAGIC_0,
  CFG_MAGIC_1,
  CFG_OFFSET,
  CFG_SIZE,
  KEYMAP_ENTRY_SIZE,
  KEYMAP_KEY_COUNT,
  KEYMAP_SIZE,
  KEY_TYPE,
  PALETTE_COLORS_PER_EFFECT,
  PALETTE_EFFECT_COUNT,
  PALETTE_SIZE,
  PALETTE_TAIL_SIZE,
  RGB_SIZE,
  SLEEP_STEPS,
  SLEEP_STEP_SECONDS,
} from "./constants.ts";

export interface BatteryStatus {
  percent: number;
  flags: number;
  charging: boolean;
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface EffectSlotConfig {
  brightness: number; // 0..9
  speed: number; // 0..4
  color: number; // 0..7 (7 = multicolor)
}

export interface DeviceConfig {
  customFlag: boolean;
  effectId: number;
  winLock: boolean;
  sleepStep: number;
  sleepSeconds: number;
  slots: EffectSlotConfig[];
  raw: Uint8Array;
}

export interface PaletteData {
  effects: RgbColor[][];
  tail: Uint8Array;
  raw: Uint8Array;
}

export type KeyEntry =
  | {
      kind: "std";
      modifiers: number;
      hidCode: number;
      raw: [number, number, number, number];
    }
  | {
      kind: "consumer";
      usage: number;
      raw: [number, number, number, number];
    }
  | {
      kind: "fw";
      code: number;
      raw: [number, number, number, number];
    }
  | {
      kind: "fn_fx";
      fx: number;
      op: number;
      arg: number;
      raw: [number, number, number, number];
    }
  | {
      kind: "fn";
      raw: [number, number, number, number];
    }
  | {
      kind: "unknown";
      raw: [number, number, number, number];
    };

export const CFG_SLOT_COUNT = 24;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalizeSleepStep(step: number): number {
  if (step <= 0) {
    return 0;
  }
  let best: number = SLEEP_STEPS[1];
  let bestDiff = Math.abs(step - best);
  for (let i = 1; i < SLEEP_STEPS.length; i++) {
    const candidate = SLEEP_STEPS[i];
    const diff = Math.abs(step - candidate);
    if (diff < bestDiff) {
      best = candidate;
      bestDiff = diff;
    }
  }
  return best;
}

export function sleepSecondsToStep(seconds: number): number {
  if (seconds <= 0) {
    return 0;
  }
  return normalizeSleepStep(Math.round(seconds / SLEEP_STEP_SECONDS));
}

export function stepToSleepSeconds(step: number): number {
  return step <= 0 ? 0 : step * SLEEP_STEP_SECONDS;
}

export function decodeBattery(payload: Uint8Array): BatteryStatus {
  const percent = clamp(payload[0] ?? 0, 0, 100);
  const flags = payload[1] ?? 0;
  return {
    percent,
    flags,
    charging: (flags & BATTERY_CHARGING_FLAG) !== 0,
  };
}

export function decodeConfig(raw: Uint8Array): DeviceConfig {
  if (raw.length !== CFG_SIZE) {
    throw new Error(`Invalid config length: expected ${CFG_SIZE}, got ${raw.length}`);
  }
  if (raw[CFG_OFFSET.MAGIC_0] !== CFG_MAGIC_0 || raw[CFG_OFFSET.MAGIC_1] !== CFG_MAGIC_1) {
    throw new Error(
      `Invalid config magic: expected 5A A5, got ${raw[CFG_OFFSET.MAGIC_0].toString(16)} ${raw[CFG_OFFSET.MAGIC_1].toString(16)}`,
    );
  }

  const slots: EffectSlotConfig[] = [];
  for (let i = 0; i < CFG_SLOT_COUNT; i++) {
    const base = CFG_OFFSET.EFFECT_SLOTS_BASE + i * 2;
    const brightness = raw[base];
    const packed = raw[base + 1];
    slots.push({
      brightness,
      speed: (packed >> 4) & 0x0f,
      color: packed & 0x0f,
    });
  }

  const sleepStep = raw[CFG_OFFSET.SLEEP_STEP];

  return {
    customFlag: raw[CFG_OFFSET.CUSTOM_FLAG] !== 0,
    effectId: raw[CFG_OFFSET.EFFECT_ID],
    winLock: raw[CFG_OFFSET.WIN_LOCK] !== 0,
    sleepStep,
    sleepSeconds: stepToSleepSeconds(sleepStep),
    slots,
    raw: raw.slice(),
  };
}

export function encodeConfig(config: DeviceConfig): Uint8Array {
  if (config.raw.length !== CFG_SIZE) {
    throw new Error(`Invalid raw config length: expected ${CFG_SIZE}, got ${config.raw.length}`);
  }
  const out = config.raw.slice();
  out[CFG_OFFSET.CUSTOM_FLAG] = config.customFlag ? 1 : 0;
  out[CFG_OFFSET.EFFECT_ID] = config.effectId & 0xff;
  out[CFG_OFFSET.WIN_LOCK] = config.winLock ? 1 : 0;
  out[CFG_OFFSET.SLEEP_STEP] = normalizeSleepStep(config.sleepStep);

  const count = Math.min(CFG_SLOT_COUNT, config.slots.length);
  for (let i = 0; i < count; i++) {
    const slot = config.slots[i];
    const base = CFG_OFFSET.EFFECT_SLOTS_BASE + i * 2;
    out[base] = clamp(Math.round(slot.brightness), 0, 9);
    out[base + 1] = ((slot.speed & 0x0f) << 4) | (slot.color & 0x0f);
  }

  out[CFG_OFFSET.MAGIC_0] = CFG_MAGIC_0;
  out[CFG_OFFSET.MAGIC_1] = CFG_MAGIC_1;
  return out;
}

export function decodeRgbMap(raw: Uint8Array): RgbColor[] {
  if (raw.length !== RGB_SIZE) {
    throw new Error(`Invalid RGB map length: expected ${RGB_SIZE}, got ${raw.length}`);
  }
  const colors: RgbColor[] = new Array(KEYMAP_KEY_COUNT);
  for (let i = 0; i < KEYMAP_KEY_COUNT; i++) {
    colors[i] = {
      r: raw[i],
      g: raw[KEYMAP_KEY_COUNT + i],
      b: raw[KEYMAP_KEY_COUNT * 2 + i],
    };
  }
  return colors;
}

export function encodeRgbMap(colors: readonly RgbColor[]): Uint8Array {
  if (colors.length !== KEYMAP_KEY_COUNT) {
    throw new Error(`Invalid RGB color count: expected ${KEYMAP_KEY_COUNT}, got ${colors.length}`);
  }
  const out = new Uint8Array(RGB_SIZE);
  for (let i = 0; i < KEYMAP_KEY_COUNT; i++) {
    const c = colors[i];
    out[i] = clamp(Math.round(c.r), 0, 255);
    out[KEYMAP_KEY_COUNT + i] = clamp(Math.round(c.g), 0, 255);
    out[KEYMAP_KEY_COUNT * 2 + i] = clamp(Math.round(c.b), 0, 255);
  }
  return out;
}

export function decodePalette(raw: Uint8Array): PaletteData {
  if (raw.length !== PALETTE_SIZE) {
    throw new Error(`Invalid palette length: expected ${PALETTE_SIZE}, got ${raw.length}`);
  }
  const effects: RgbColor[][] = [];
  let offset = 0;
  for (let e = 0; e < PALETTE_EFFECT_COUNT; e++) {
    const row: RgbColor[] = [];
    for (let c = 0; c < PALETTE_COLORS_PER_EFFECT; c++) {
      row.push({
        r: raw[offset],
        g: raw[offset + 1],
        b: raw[offset + 2],
      });
      offset += 3;
    }
    effects.push(row);
  }
  const tail = raw.slice(PALETTE_SIZE - PALETTE_TAIL_SIZE, PALETTE_SIZE);
  return {
    effects,
    tail,
    raw: raw.slice(),
  };
}

export function encodePalette(palette: PaletteData): Uint8Array {
  const out =
    palette.raw.length === PALETTE_SIZE ? palette.raw.slice() : new Uint8Array(PALETTE_SIZE);
  let offset = 0;
  const effectCount = Math.min(PALETTE_EFFECT_COUNT, palette.effects.length);
  for (let e = 0; e < effectCount; e++) {
    const row = palette.effects[e];
    const colorCount = Math.min(PALETTE_COLORS_PER_EFFECT, row.length);
    for (let c = 0; c < colorCount; c++) {
      const rgb = row[c];
      out[offset + c * 3] = clamp(Math.round(rgb.r), 0, 255);
      out[offset + c * 3 + 1] = clamp(Math.round(rgb.g), 0, 255);
      out[offset + c * 3 + 2] = clamp(Math.round(rgb.b), 0, 255);
    }
    offset += PALETTE_COLORS_PER_EFFECT * 3;
  }
  if (palette.tail.length === PALETTE_TAIL_SIZE) {
    out.set(palette.tail, PALETTE_SIZE - PALETTE_TAIL_SIZE);
  }
  return out;
}

export function decodeKeyEntry(bytes: Uint8Array, offset = 0): KeyEntry {
  const b0 = bytes[offset] ?? 0;
  const b1 = bytes[offset + 1] ?? 0;
  const b2 = bytes[offset + 2] ?? 0;
  const b3 = bytes[offset + 3] ?? 0;
  const raw: [number, number, number, number] = [b0, b1, b2, b3];

  switch (b0) {
    case KEY_TYPE.STD:
      return { kind: "std", modifiers: b1, hidCode: b3, raw };
    case KEY_TYPE.CONSUMER:
      return { kind: "consumer", usage: (b2 << 8) | b3, raw };
    case KEY_TYPE.FW:
      return { kind: "fw", code: (b1 << 16) | (b2 << 8) | b3, raw };
    case KEY_TYPE.FN_FX:
      return { kind: "fn_fx", fx: b1, op: b2, arg: b3, raw };
    case KEY_TYPE.FN:
      return { kind: "fn", raw };
    default:
      return { kind: "unknown", raw };
  }
}

export function encodeKeyEntry(entry: KeyEntry): [number, number, number, number] {
  switch (entry.kind) {
    case "std":
      return [KEY_TYPE.STD, entry.modifiers & 0xff, entry.raw[2] & 0xff, entry.hidCode & 0xff];
    case "consumer":
      return [
        KEY_TYPE.CONSUMER,
        entry.raw[1] & 0xff,
        (entry.usage >> 8) & 0xff,
        entry.usage & 0xff,
      ];
    case "fw":
      return [
        KEY_TYPE.FW,
        (entry.code >> 16) & 0xff,
        (entry.code >> 8) & 0xff,
        entry.code & 0xff,
      ];
    case "fn_fx":
      return [KEY_TYPE.FN_FX, entry.fx & 0xff, entry.op & 0xff, entry.arg & 0xff];
    case "fn":
      return [KEY_TYPE.FN, entry.raw[1] & 0xff, entry.raw[2] & 0xff, entry.raw[3] & 0xff];
    case "unknown":
      return [
        entry.raw[0] & 0xff,
        entry.raw[1] & 0xff,
        entry.raw[2] & 0xff,
        entry.raw[3] & 0xff,
      ];
  }
}

export function decodeKeymap(raw: Uint8Array): KeyEntry[] {
  if (raw.length !== KEYMAP_SIZE) {
    throw new Error(`Invalid keymap length: expected ${KEYMAP_SIZE}, got ${raw.length}`);
  }
  const entries: KeyEntry[] = new Array(KEYMAP_KEY_COUNT);
  for (let i = 0; i < KEYMAP_KEY_COUNT; i++) {
    entries[i] = decodeKeyEntry(raw, i * KEYMAP_ENTRY_SIZE);
  }
  return entries;
}

export function encodeKeymap(entries: readonly KeyEntry[]): Uint8Array {
  if (entries.length !== KEYMAP_KEY_COUNT) {
    throw new Error(`Invalid keymap entry count: expected ${KEYMAP_KEY_COUNT}, got ${entries.length}`);
  }
  const out = new Uint8Array(KEYMAP_SIZE);
  for (let i = 0; i < KEYMAP_KEY_COUNT; i++) {
    const encoded = encodeKeyEntry(entries[i]);
    const base = i * KEYMAP_ENTRY_SIZE;
    out[base] = encoded[0];
    out[base + 1] = encoded[1];
    out[base + 2] = encoded[2];
    out[base + 3] = encoded[3];
  }
  return out;
}

export function createStdKeyEntry(hidCode: number, modifiers = 0): KeyEntry {
  const mod = modifiers & 0xff;
  const code = hidCode & 0xff;
  return { kind: "std", modifiers: mod, hidCode: code, raw: [KEY_TYPE.STD, mod, 0, code] };
}

export function createConsumerKeyEntry(usage: number): KeyEntry {
  const hi = (usage >> 8) & 0xff;
  const lo = usage & 0xff;
  return { kind: "consumer", usage: usage & 0xffff, raw: [KEY_TYPE.CONSUMER, 0, hi, lo] };
}

export function createFwKeyEntry(code: number): KeyEntry {
  const b1 = (code >> 16) & 0xff;
  const b2 = (code >> 8) & 0xff;
  const b3 = code & 0xff;
  return { kind: "fw", code: code & 0xffffff, raw: [KEY_TYPE.FW, b1, b2, b3] };
}

export function createFnFxKeyEntry(fx: number, op: number, arg = 0): KeyEntry {
  return {
    kind: "fn_fx",
    fx: fx & 0xff,
    op: op & 0xff,
    arg: arg & 0xff,
    raw: [KEY_TYPE.FN_FX, fx & 0xff, op & 0xff, arg & 0xff],
  };
}

export function createFnKeyEntry(): KeyEntry {
  return { kind: "fn", raw: [KEY_TYPE.FN, 0, 0, 0] };
}

export function keyEntryEquals(a: KeyEntry, b: KeyEntry): boolean {
  const ea = encodeKeyEntry(a);
  const eb = encodeKeyEntry(b);
  return ea[0] === eb[0] && ea[1] === eb[1] && ea[2] === eb[2] && ea[3] === eb[3];
}
