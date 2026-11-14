import { HI75C_KEY_BY_ID } from './hi75cLayout';

export const PROFILE_SCHEMA_VERSION = 1 as const;
export const PROFILE_DEVICE_NAME = 'LEOBOG Hi75C Pro' as const;

export type RgbTuple = [number, number, number];

export interface ProfileLighting {
  effectId: number;
  brightness: number;
  speed: number;
  colorIndex: number;
  multicolor: boolean;
  customFlag: boolean;
  winLock: boolean;
  sleepSeconds: number;
  customColor?: RgbTuple;
}

export interface Hi75cProfile {
  schemaVersion: typeof PROFILE_SCHEMA_VERSION;
  device: typeof PROFILE_DEVICE_NAME;
  exportedAt: string;
  keymap: {
    base: Record<string, number>;
    fn1: Record<string, number>;
  };
  lighting: ProfileLighting;
  perKeyRgb: Record<string, RgbTuple>;
}

const VALID_SLEEP_SECONDS = new Set([0, 60, 90, 120, 180, 240, 300, 600, 900, 1200]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isIntInRange(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

function isRgbTuple(v: unknown): v is RgbTuple {
  return (
    Array.isArray(v) &&
    v.length === 3 &&
    isIntInRange(v[0], 0, 255) &&
    isIntInRange(v[1], 0, 255) &&
    isIntInRange(v[2], 0, 255)
  );
}

function validateKeymapLayer(layer: unknown, label: string): Record<string, number> {
  if (!isPlainObject(layer)) {
    throw new Error(`Invalid profile: keymap.${label} must be an object`);
  }
  const result: Record<string, number> = {};
  for (const [keyId, val] of Object.entries(layer)) {
    if (!HI75C_KEY_BY_ID.has(keyId)) {
      throw new Error(`Invalid profile: unknown key id "${keyId}" in keymap.${label}`);
    }
    if (!isIntInRange(val, 0, 0xffffffff)) {
      throw new Error(`Invalid profile: keymap.${label}.${keyId} must be a 32-bit unsigned integer`);
    }
    result[keyId] = val >>> 0;
  }
  return result;
}

function validatePerKeyRgb(raw: unknown): Record<string, RgbTuple> {
  if (!isPlainObject(raw)) {
    throw new Error('Invalid profile: perKeyRgb must be an object');
  }
  const result: Record<string, RgbTuple> = {};
  for (const [keyId, val] of Object.entries(raw)) {
    if (!HI75C_KEY_BY_ID.has(keyId)) {
      throw new Error(`Invalid profile: unknown key id "${keyId}" in perKeyRgb`);
    }
    if (!isRgbTuple(val)) {
      throw new Error(`Invalid profile: perKeyRgb.${keyId} must be [r, g, b] (0..255)`);
    }
    result[keyId] = [val[0], val[1], val[2]];
  }
  return result;
}

function validateLighting(raw: unknown): ProfileLighting {
  if (!isPlainObject(raw)) {
    throw new Error('Invalid profile: lighting must be an object');
  }
  if (!isIntInRange(raw.effectId, 0, 32)) {
    throw new Error('Invalid profile: lighting.effectId must be an integer 0..32');
  }
  if (!isIntInRange(raw.brightness, 0, 9)) {
    throw new Error('Invalid profile: lighting.brightness must be an integer 0..9');
  }
  if (!isIntInRange(raw.speed, 0, 4)) {
    throw new Error('Invalid profile: lighting.speed must be an integer 0..4');
  }
  if (!isIntInRange(raw.colorIndex, 0, 7)) {
    throw new Error('Invalid profile: lighting.colorIndex must be an integer 0..7');
  }
  if (typeof raw.multicolor !== 'boolean') {
    throw new Error('Invalid profile: lighting.multicolor must be a boolean');
  }
  if (typeof raw.customFlag !== 'boolean') {
    throw new Error('Invalid profile: lighting.customFlag must be a boolean');
  }
  if (typeof raw.winLock !== 'boolean') {
    throw new Error('Invalid profile: lighting.winLock must be a boolean');
  }
  if (typeof raw.sleepSeconds !== 'number' || !VALID_SLEEP_SECONDS.has(raw.sleepSeconds)) {
    throw new Error('Invalid profile: lighting.sleepSeconds is not a supported timer value');
  }
  if (raw.customColor !== undefined && !isRgbTuple(raw.customColor)) {
    throw new Error('Invalid profile: lighting.customColor must be [r, g, b] (0..255)');
  }

  return {
    effectId: raw.effectId,
    brightness: raw.brightness,
    speed: raw.speed,
    colorIndex: raw.colorIndex,
    multicolor: raw.multicolor,
    customFlag: raw.customFlag,
    winLock: raw.winLock,
    sleepSeconds: raw.sleepSeconds,
    ...(raw.customColor ? { customColor: [raw.customColor[0], raw.customColor[1], raw.customColor[2]] } : {}),
  };
}

export function parseProfile(raw: unknown): Hi75cProfile {
  const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!isPlainObject(obj)) {
    throw new Error('Invalid profile: root must be a JSON object');
  }
  if (obj.schemaVersion !== PROFILE_SCHEMA_VERSION) {
    throw new Error(`Unsupported profile schemaVersion: ${String(obj.schemaVersion)}`);
  }
  if (obj.device !== PROFILE_DEVICE_NAME) {
    throw new Error(`Invalid profile device: expected "${PROFILE_DEVICE_NAME}"`);
  }
  if (typeof obj.exportedAt !== 'string' || Number.isNaN(Date.parse(obj.exportedAt))) {
    throw new Error('Invalid profile: exportedAt must be a valid ISO date string');
  }
  if (!isPlainObject(obj.keymap)) {
    throw new Error('Invalid profile: keymap must be an object');
  }

  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    device: PROFILE_DEVICE_NAME,
    exportedAt: obj.exportedAt,
    keymap: {
      base: validateKeymapLayer(obj.keymap.base, 'base'),
      fn1: validateKeymapLayer(obj.keymap.fn1, 'fn1'),
    },
    lighting: validateLighting(obj.lighting),
    perKeyRgb: validatePerKeyRgb(obj.perKeyRgb),
  };
}

export function validateProfile(raw: unknown): raw is Hi75cProfile {
  try {
    parseProfile(raw);
    return true;
  } catch {
    return false;
  }
}

export function serializeProfile(profile: Hi75cProfile): string {
  const validated = parseProfile(profile);
  return JSON.stringify(validated, null, 2);
}
