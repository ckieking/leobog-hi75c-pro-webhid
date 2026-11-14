export type KeyCategory =
  | 'alpha'
  | 'number'
  | 'function'
  | 'modifier'
  | 'navigation'
  | 'symbol'
  | 'knob';

export interface KeyDef {
  id: string;
  matrixIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
  defaultLabel: string;
  category: KeyCategory;
  defaultBase4B: number;
  defaultFn4B: number;
}

export interface LightingEffectDef {
  id: number;
  hwEffectId: number;
  supportsSpeed: boolean;
  supportsBrightness: boolean;
  supportsColor: boolean;
  supportsMulticolor: boolean;
  nameEn: string;
  nameZhTW: string;
}

export type KeycodeGroup = 'standard' | 'modifier' | 'consumer' | 'firmware' | 'special';

export interface KeycodeCatalogEntry {
  code4B: number;
  group: KeycodeGroup;
  hidUsage?: number;
  labelEn: string;
  labelZhTW: string;
  shortLabel: string;
}

export const KEY_ENTRY_FN = 0x0d000000;
export const KEY_ENTRY_DISABLED = 0x00000000;

export const MODIFIER_BITS = {
  LCTRL: 0x01,
  LSHIFT: 0x02,
  LALT: 0x04,
  LWIN: 0x08,
  RCTRL: 0x10,
  RSHIFT: 0x20,
  RALT: 0x40,
  RWIN: 0x80,
} as const;

export function encodeStdKey4B(hidUsage: number, modifiers = 0): number {
  return (((modifiers & 0xff) << 16) | (hidUsage & 0xff)) >>> 0;
}

export function encodeConsumer4B(usage16: number): number {
  return ((0x02 << 24) | (usage16 & 0xffff)) >>> 0;
}

/**
 * 82-key physical & matrix definition for LEOBOG Hi75C Pro (ANSI 75% + Knob).
 * Coordinates (x, y, w, h) are in standard 1u keycap units (16.25u x 6.5u).
 * Matrix indices (0..89) and FN1 defaults match KB.ini.
 * Note: RAlt is matrixIndex 53, FN is matrixIndex 59, K82 Knob is matrixIndex 84.
 */
export const HI75C_KEYS: readonly KeyDef[] = [
  // Row 0: Function row + Knob
  { id: 'K1', matrixIndex: 0, x: 0, y: 0, w: 1, h: 1, defaultLabel: 'Esc', category: 'function', defaultBase4B: 0x00000029, defaultFn4B: 0x07000004 },
  { id: 'K2', matrixIndex: 12, x: 2, y: 0, w: 1, h: 1, defaultLabel: 'F1', category: 'function', defaultBase4B: 0x0000003a, defaultFn4B: 0x02000070 },
  { id: 'K3', matrixIndex: 18, x: 3, y: 0, w: 1, h: 1, defaultLabel: 'F2', category: 'function', defaultBase4B: 0x0000003b, defaultFn4B: 0x0200006f },
  { id: 'K4', matrixIndex: 24, x: 4, y: 0, w: 1, h: 1, defaultLabel: 'F3', category: 'function', defaultBase4B: 0x0000003c, defaultFn4B: 0x0004002b },
  { id: 'K5', matrixIndex: 30, x: 5, y: 0, w: 1, h: 1, defaultLabel: 'F4', category: 'function', defaultBase4B: 0x0000003d, defaultFn4B: 0x00040029 },
  { id: 'K6', matrixIndex: 36, x: 6.5, y: 0, w: 1, h: 1, defaultLabel: 'F5', category: 'function', defaultBase4B: 0x0000003e, defaultFn4B: 0x08030200 },
  { id: 'K7', matrixIndex: 42, x: 7.5, y: 0, w: 1, h: 1, defaultLabel: 'F6', category: 'function', defaultBase4B: 0x0000003f, defaultFn4B: 0x08030100 },
  { id: 'K8', matrixIndex: 48, x: 8.5, y: 0, w: 1, h: 1, defaultLabel: 'F7', category: 'function', defaultBase4B: 0x00000040, defaultFn4B: 0x020000b6 },
  { id: 'K9', matrixIndex: 54, x: 9.5, y: 0, w: 1, h: 1, defaultLabel: 'F8', category: 'function', defaultBase4B: 0x00000041, defaultFn4B: 0x020000cd },
  { id: 'K10', matrixIndex: 60, x: 11, y: 0, w: 1, h: 1, defaultLabel: 'F9', category: 'function', defaultBase4B: 0x00000042, defaultFn4B: 0x020000b5 },
  { id: 'K11', matrixIndex: 66, x: 12, y: 0, w: 1, h: 1, defaultLabel: 'F10', category: 'function', defaultBase4B: 0x00000043, defaultFn4B: 0x020000e2 },
  { id: 'K12', matrixIndex: 72, x: 13, y: 0, w: 1, h: 1, defaultLabel: 'F11', category: 'function', defaultBase4B: 0x00000044, defaultFn4B: 0x020000ea },
  { id: 'K13', matrixIndex: 78, x: 14, y: 0, w: 1, h: 1, defaultLabel: 'F12', category: 'function', defaultBase4B: 0x00000045, defaultFn4B: 0x020000e9 },
  { id: 'K82', matrixIndex: 84, x: 15.25, y: 0, w: 1, h: 1, defaultLabel: 'Knob', category: 'knob', defaultBase4B: 0x0700001d, defaultFn4B: 0x0700001d },

  // Row 1: Number row + Delete
  { id: 'K15', matrixIndex: 1, x: 0, y: 1.25, w: 1, h: 1, defaultLabel: '`', category: 'symbol', defaultBase4B: 0x00000035, defaultFn4B: 0x00000000 },
  { id: 'K16', matrixIndex: 7, x: 1, y: 1.25, w: 1, h: 1, defaultLabel: '1', category: 'number', defaultBase4B: 0x0000001e, defaultFn4B: 0x00000000 },
  { id: 'K17', matrixIndex: 13, x: 2, y: 1.25, w: 1, h: 1, defaultLabel: '2', category: 'number', defaultBase4B: 0x0000001f, defaultFn4B: 0x00000000 },
  { id: 'K18', matrixIndex: 19, x: 3, y: 1.25, w: 1, h: 1, defaultLabel: '3', category: 'number', defaultBase4B: 0x00000020, defaultFn4B: 0x00000000 },
  { id: 'K19', matrixIndex: 25, x: 4, y: 1.25, w: 1, h: 1, defaultLabel: '4', category: 'number', defaultBase4B: 0x00000021, defaultFn4B: 0x00000000 },
  { id: 'K20', matrixIndex: 31, x: 5, y: 1.25, w: 1, h: 1, defaultLabel: '5', category: 'number', defaultBase4B: 0x00000022, defaultFn4B: 0x00000000 },
  { id: 'K21', matrixIndex: 37, x: 6, y: 1.25, w: 1, h: 1, defaultLabel: '6', category: 'number', defaultBase4B: 0x00000023, defaultFn4B: 0x00000000 },
  { id: 'K22', matrixIndex: 43, x: 7, y: 1.25, w: 1, h: 1, defaultLabel: '7', category: 'number', defaultBase4B: 0x00000024, defaultFn4B: 0x00000000 },
  { id: 'K23', matrixIndex: 49, x: 8, y: 1.25, w: 1, h: 1, defaultLabel: '8', category: 'number', defaultBase4B: 0x00000025, defaultFn4B: 0x00000000 },
  { id: 'K24', matrixIndex: 55, x: 9, y: 1.25, w: 1, h: 1, defaultLabel: '9', category: 'number', defaultBase4B: 0x00000026, defaultFn4B: 0x00000000 },
  { id: 'K25', matrixIndex: 61, x: 10, y: 1.25, w: 1, h: 1, defaultLabel: '0', category: 'number', defaultBase4B: 0x00000027, defaultFn4B: 0x00000000 },
  { id: 'K26', matrixIndex: 67, x: 11, y: 1.25, w: 1, h: 1, defaultLabel: '-', category: 'symbol', defaultBase4B: 0x0000002d, defaultFn4B: 0x00000000 },
  { id: 'K27', matrixIndex: 73, x: 12, y: 1.25, w: 1, h: 1, defaultLabel: '=', category: 'symbol', defaultBase4B: 0x0000002e, defaultFn4B: 0x00000000 },
  { id: 'K28', matrixIndex: 79, x: 13, y: 1.25, w: 2, h: 1, defaultLabel: 'Backspace', category: 'modifier', defaultBase4B: 0x0000002a, defaultFn4B: 0x0700001c },
  { id: 'K29', matrixIndex: 85, x: 15.25, y: 1.25, w: 1, h: 1, defaultLabel: 'Del', category: 'navigation', defaultBase4B: 0x0000004c, defaultFn4B: 0x00000049 },

  // Row 2: QWERTY + End
  { id: 'K30', matrixIndex: 2, x: 0, y: 2.25, w: 1.5, h: 1, defaultLabel: 'Tab', category: 'modifier', defaultBase4B: 0x0000002b, defaultFn4B: 0x08020000 },
  { id: 'K31', matrixIndex: 8, x: 1.5, y: 2.25, w: 1, h: 1, defaultLabel: 'Q', category: 'alpha', defaultBase4B: 0x00000014, defaultFn4B: 0x07000019 },
  { id: 'K32', matrixIndex: 14, x: 2.5, y: 2.25, w: 1, h: 1, defaultLabel: 'W', category: 'alpha', defaultBase4B: 0x0000001a, defaultFn4B: 0x07000018 },
  { id: 'K33', matrixIndex: 20, x: 3.5, y: 2.25, w: 1, h: 1, defaultLabel: 'E', category: 'alpha', defaultBase4B: 0x00000008, defaultFn4B: 0x0700001a },
  { id: 'K34', matrixIndex: 26, x: 4.5, y: 2.25, w: 1, h: 1, defaultLabel: 'R', category: 'alpha', defaultBase4B: 0x00000015, defaultFn4B: 0x0700001b },
  { id: 'K35', matrixIndex: 32, x: 5.5, y: 2.25, w: 1, h: 1, defaultLabel: 'T', category: 'alpha', defaultBase4B: 0x00000017, defaultFn4B: 0x00000000 },
  { id: 'K36', matrixIndex: 38, x: 6.5, y: 2.25, w: 1, h: 1, defaultLabel: 'Y', category: 'alpha', defaultBase4B: 0x0000001c, defaultFn4B: 0x00000000 },
  { id: 'K37', matrixIndex: 44, x: 7.5, y: 2.25, w: 1, h: 1, defaultLabel: 'U', category: 'alpha', defaultBase4B: 0x00000018, defaultFn4B: 0x00000046 },
  { id: 'K38', matrixIndex: 50, x: 8.5, y: 2.25, w: 1, h: 1, defaultLabel: 'I', category: 'alpha', defaultBase4B: 0x0000000c, defaultFn4B: 0x00000047 },
  { id: 'K39', matrixIndex: 56, x: 9.5, y: 2.25, w: 1, h: 1, defaultLabel: 'O', category: 'alpha', defaultBase4B: 0x00000012, defaultFn4B: 0x00000048 },
  { id: 'K40', matrixIndex: 62, x: 10.5, y: 2.25, w: 1, h: 1, defaultLabel: 'P', category: 'alpha', defaultBase4B: 0x00000013, defaultFn4B: 0x00000000 },
  { id: 'K41', matrixIndex: 68, x: 11.5, y: 2.25, w: 1, h: 1, defaultLabel: '[', category: 'symbol', defaultBase4B: 0x0000002f, defaultFn4B: 0x00000000 },
  { id: 'K42', matrixIndex: 74, x: 12.5, y: 2.25, w: 1, h: 1, defaultLabel: ']', category: 'symbol', defaultBase4B: 0x00000030, defaultFn4B: 0x00000000 },
  { id: 'K43', matrixIndex: 80, x: 13.5, y: 2.25, w: 1.5, h: 1, defaultLabel: '\\', category: 'symbol', defaultBase4B: 0x00000031, defaultFn4B: 0x08000000 },
  { id: 'K44', matrixIndex: 86, x: 15.25, y: 2.25, w: 1, h: 1, defaultLabel: 'End', category: 'navigation', defaultBase4B: 0x0000004d, defaultFn4B: 0x0000004a },

  // Row 3: Home row + PgUp
  { id: 'K45', matrixIndex: 3, x: 0, y: 3.25, w: 1.75, h: 1, defaultLabel: 'Caps', category: 'modifier', defaultBase4B: 0x00000039, defaultFn4B: 0x00000000 },
  { id: 'K46', matrixIndex: 9, x: 1.75, y: 3.25, w: 1, h: 1, defaultLabel: 'A', category: 'alpha', defaultBase4B: 0x00000004, defaultFn4B: 0x00000000 },
  { id: 'K47', matrixIndex: 15, x: 2.75, y: 3.25, w: 1, h: 1, defaultLabel: 'S', category: 'alpha', defaultBase4B: 0x00000016, defaultFn4B: 0x00000000 },
  { id: 'K48', matrixIndex: 21, x: 3.75, y: 3.25, w: 1, h: 1, defaultLabel: 'D', category: 'alpha', defaultBase4B: 0x00000007, defaultFn4B: 0x00000000 },
  { id: 'K49', matrixIndex: 27, x: 4.75, y: 3.25, w: 1, h: 1, defaultLabel: 'F', category: 'alpha', defaultBase4B: 0x00000009, defaultFn4B: 0x00000000 },
  { id: 'K50', matrixIndex: 33, x: 5.75, y: 3.25, w: 1, h: 1, defaultLabel: 'G', category: 'alpha', defaultBase4B: 0x0000000a, defaultFn4B: 0x00000000 },
  { id: 'K51', matrixIndex: 39, x: 6.75, y: 3.25, w: 1, h: 1, defaultLabel: 'H', category: 'alpha', defaultBase4B: 0x0000000b, defaultFn4B: 0x00000000 },
  { id: 'K52', matrixIndex: 45, x: 7.75, y: 3.25, w: 1, h: 1, defaultLabel: 'J', category: 'alpha', defaultBase4B: 0x0000000d, defaultFn4B: 0x00000000 },
  { id: 'K53', matrixIndex: 51, x: 8.75, y: 3.25, w: 1, h: 1, defaultLabel: 'K', category: 'alpha', defaultBase4B: 0x0000000e, defaultFn4B: 0x00000000 },
  { id: 'K54', matrixIndex: 57, x: 9.75, y: 3.25, w: 1, h: 1, defaultLabel: 'L', category: 'alpha', defaultBase4B: 0x0000000f, defaultFn4B: 0x00000000 },
  { id: 'K55', matrixIndex: 63, x: 10.75, y: 3.25, w: 1, h: 1, defaultLabel: ';', category: 'symbol', defaultBase4B: 0x00000033, defaultFn4B: 0x00000000 },
  { id: 'K56', matrixIndex: 69, x: 11.75, y: 3.25, w: 1, h: 1, defaultLabel: "'", category: 'symbol', defaultBase4B: 0x00000034, defaultFn4B: 0x00000000 },
  { id: 'K57', matrixIndex: 81, x: 12.75, y: 3.25, w: 2.25, h: 1, defaultLabel: 'Enter', category: 'modifier', defaultBase4B: 0x00000028, defaultFn4B: 0x00000000 },
  { id: 'K81', matrixIndex: 87, x: 15.25, y: 3.25, w: 1, h: 1, defaultLabel: 'PgUp', category: 'navigation', defaultBase4B: 0x0000004b, defaultFn4B: 0x00000000 },

  // Row 4: Shift row + Up + PgDn
  { id: 'K58', matrixIndex: 4, x: 0, y: 4.25, w: 2.25, h: 1, defaultLabel: 'LShift', category: 'modifier', defaultBase4B: 0x000000e1, defaultFn4B: 0x00000000 },
  { id: 'K59', matrixIndex: 10, x: 2.25, y: 4.25, w: 1, h: 1, defaultLabel: 'Z', category: 'alpha', defaultBase4B: 0x0000001d, defaultFn4B: 0x00000000 },
  { id: 'K60', matrixIndex: 16, x: 3.25, y: 4.25, w: 1, h: 1, defaultLabel: 'X', category: 'alpha', defaultBase4B: 0x0000001b, defaultFn4B: 0x00000000 },
  { id: 'K61', matrixIndex: 22, x: 4.25, y: 4.25, w: 1, h: 1, defaultLabel: 'C', category: 'alpha', defaultBase4B: 0x00000006, defaultFn4B: 0x00000000 },
  { id: 'K62', matrixIndex: 28, x: 5.25, y: 4.25, w: 1, h: 1, defaultLabel: 'V', category: 'alpha', defaultBase4B: 0x00000019, defaultFn4B: 0x00000000 },
  { id: 'K63', matrixIndex: 34, x: 6.25, y: 4.25, w: 1, h: 1, defaultLabel: 'B', category: 'alpha', defaultBase4B: 0x00000005, defaultFn4B: 0x00000000 },
  { id: 'K64', matrixIndex: 40, x: 7.25, y: 4.25, w: 1, h: 1, defaultLabel: 'N', category: 'alpha', defaultBase4B: 0x00000011, defaultFn4B: 0x00000000 },
  { id: 'K65', matrixIndex: 46, x: 8.25, y: 4.25, w: 1, h: 1, defaultLabel: 'M', category: 'alpha', defaultBase4B: 0x00000010, defaultFn4B: 0x00000000 },
  { id: 'K66', matrixIndex: 52, x: 9.25, y: 4.25, w: 1, h: 1, defaultLabel: ',', category: 'symbol', defaultBase4B: 0x00000036, defaultFn4B: 0x00000000 },
  { id: 'K67', matrixIndex: 58, x: 10.25, y: 4.25, w: 1, h: 1, defaultLabel: '.', category: 'symbol', defaultBase4B: 0x00000037, defaultFn4B: 0x00000000 },
  { id: 'K68', matrixIndex: 64, x: 11.25, y: 4.25, w: 1, h: 1, defaultLabel: '/', category: 'symbol', defaultBase4B: 0x00000038, defaultFn4B: 0x00000000 },
  { id: 'K69', matrixIndex: 70, x: 12.25, y: 4.25, w: 1.75, h: 1, defaultLabel: 'RShift', category: 'modifier', defaultBase4B: 0x000000e5, defaultFn4B: 0x00000000 },
  { id: 'K70', matrixIndex: 82, x: 14.25, y: 4.5, w: 1, h: 1, defaultLabel: 'Up', category: 'navigation', defaultBase4B: 0x00000052, defaultFn4B: 0x08030100 },
  { id: 'K14', matrixIndex: 88, x: 15.25, y: 4.25, w: 1, h: 1, defaultLabel: 'PgDn', category: 'navigation', defaultBase4B: 0x0000004e, defaultFn4B: 0x00000000 },

  // Row 5: Bottom row + Arrows
  { id: 'K71', matrixIndex: 5, x: 0, y: 5.25, w: 1.25, h: 1, defaultLabel: 'LCtrl', category: 'modifier', defaultBase4B: 0x000000e0, defaultFn4B: 0x00000000 },
  { id: 'K72', matrixIndex: 11, x: 1.25, y: 5.25, w: 1.25, h: 1, defaultLabel: 'LWin', category: 'modifier', defaultBase4B: 0x000000e3, defaultFn4B: 0x07000001 },
  { id: 'K73', matrixIndex: 17, x: 2.5, y: 5.25, w: 1.25, h: 1, defaultLabel: 'LAlt', category: 'modifier', defaultBase4B: 0x000000e2, defaultFn4B: 0x00000000 },
  { id: 'K74', matrixIndex: 35, x: 3.75, y: 5.25, w: 6.25, h: 1, defaultLabel: 'Space', category: 'modifier', defaultBase4B: 0x0000002c, defaultFn4B: 0x00000000 },
  { id: 'K75', matrixIndex: 53, x: 10, y: 5.25, w: 1, h: 1, defaultLabel: 'RAlt', category: 'modifier', defaultBase4B: 0x000000e6, defaultFn4B: 0x00000000 },
  { id: 'K76', matrixIndex: 59, x: 11, y: 5.25, w: 1, h: 1, defaultLabel: 'FN', category: 'modifier', defaultBase4B: KEY_ENTRY_FN, defaultFn4B: KEY_ENTRY_FN },
  { id: 'K77', matrixIndex: 65, x: 12, y: 5.25, w: 1, h: 1, defaultLabel: 'RCtrl', category: 'modifier', defaultBase4B: 0x000000e4, defaultFn4B: 0x00000000 },
  { id: 'K78', matrixIndex: 77, x: 13.25, y: 5.5, w: 1, h: 1, defaultLabel: 'Left', category: 'navigation', defaultBase4B: 0x00000050, defaultFn4B: 0x08040200 },
  { id: 'K79', matrixIndex: 83, x: 14.25, y: 5.5, w: 1, h: 1, defaultLabel: 'Down', category: 'navigation', defaultBase4B: 0x00000051, defaultFn4B: 0x08030200 },
  { id: 'K80', matrixIndex: 89, x: 15.25, y: 5.5, w: 1, h: 1, defaultLabel: 'Right', category: 'navigation', defaultBase4B: 0x0000004f, defaultFn4B: 0x08040100 },
];

export const HI75C_KEY_BY_ID: ReadonlyMap<string, KeyDef> = new Map(
  HI75C_KEYS.map((k) => [k.id, k])
);

export const HI75C_KEY_BY_MATRIX: ReadonlyMap<number, KeyDef> = new Map(
  HI75C_KEYS.map((k) => [k.matrixIndex, k])
);

export const LIGHTING_EFFECTS: readonly LightingEffectDef[] = [
  { id: 1, hwEffectId: 1, supportsSpeed: false, supportsBrightness: true, supportsColor: true, supportsMulticolor: true, nameEn: 'Fixed On', nameZhTW: '恆亮模式' },
  { id: 2, hwEffectId: 2, supportsSpeed: true, supportsBrightness: true, supportsColor: true, supportsMulticolor: true, nameEn: 'Breathing', nameZhTW: '呼吸模式' },
  { id: 3, hwEffectId: 3, supportsSpeed: true, supportsBrightness: true, supportsColor: false, supportsMulticolor: false, nameEn: 'Spectrum Cycle', nameZhTW: '幻彩循環' },
  { id: 4, hwEffectId: 4, supportsSpeed: true, supportsBrightness: true, supportsColor: true, supportsMulticolor: true, nameEn: 'Row Ripple (Key)', nameZhTW: '一觸即發（按鍵）' },
  { id: 5, hwEffectId: 5, supportsSpeed: true, supportsBrightness: true, supportsColor: true, supportsMulticolor: true, nameEn: 'Raindrops', nameZhTW: '雨中漫步' },
  { id: 6, hwEffectId: 6, supportsSpeed: true, supportsBrightness: true, supportsColor: true, supportsMulticolor: true, nameEn: 'Slow Wave', nameZhTW: '隨波逐流' },
  { id: 7, hwEffectId: 7, supportsSpeed: true, supportsBrightness: true, supportsColor: true, supportsMulticolor: true, nameEn: 'Board Ripple (Key)', nameZhTW: '漣漪擴散（按鍵）' },
  { id: 8, hwEffectId: 8, supportsSpeed: true, supportsBrightness: true, supportsColor: true, supportsMulticolor: true, nameEn: 'Stars Twinkle', nameZhTW: '繁星點點' },
  { id: 9, hwEffectId: 10, supportsSpeed: true, supportsBrightness: true, supportsColor: true, supportsMulticolor: true, nameEn: 'Snake', nameZhTW: '川流不息' },
  { id: 10, hwEffectId: 11, supportsSpeed: true, supportsBrightness: true, supportsColor: true, supportsMulticolor: true, nameEn: 'Neon Stream', nameZhTW: '彩虹流光' },
  { id: 11, hwEffectId: 12, supportsSpeed: true, supportsBrightness: true, supportsColor: true, supportsMulticolor: true, nameEn: 'Reactive (Key)', nameZhTW: '如影隨形（按鍵）' },
  { id: 12, hwEffectId: 13, supportsSpeed: true, supportsBrightness: true, supportsColor: true, supportsMulticolor: true, nameEn: 'Center Wave', nameZhTW: '中心光波' },
  { id: 13, hwEffectId: 15, supportsSpeed: true, supportsBrightness: true, supportsColor: false, supportsMulticolor: false, nameEn: 'Rainbow Wheel', nameZhTW: '彩虹輪盤' },
  { id: 14, hwEffectId: 16, supportsSpeed: true, supportsBrightness: true, supportsColor: false, supportsMulticolor: false, nameEn: 'Waterfall', nameZhTW: '七彩瀑布' },
  { id: 15, hwEffectId: 17, supportsSpeed: true, supportsBrightness: true, supportsColor: true, supportsMulticolor: true, nameEn: 'Fast Flicker', nameZhTW: '快速閃耀' },
  { id: 16, hwEffectId: 32, supportsSpeed: false, supportsBrightness: true, supportsColor: false, supportsMulticolor: false, nameEn: 'Per-Key Custom', nameZhTW: '單鍵自訂 RGB' },
  { id: 17, hwEffectId: 0, supportsSpeed: false, supportsBrightness: false, supportsColor: false, supportsMulticolor: false, nameEn: 'OFF', nameZhTW: '關閉燈效' },
];

export const RGB_COLOR_PRESETS: readonly { index: number; hex: string; nameEn: string; nameZhTW: string }[] = [
  { index: 0, hex: '#ff2b2b', nameEn: 'Red', nameZhTW: '紅' },
  { index: 1, hex: '#ff8c1a', nameEn: 'Orange', nameZhTW: '橙' },
  { index: 2, hex: '#ffe11a', nameEn: 'Yellow', nameZhTW: '黃' },
  { index: 3, hex: '#2ee65c', nameEn: 'Green', nameZhTW: '綠' },
  { index: 4, hex: '#1ae5ff', nameEn: 'Cyan', nameZhTW: '青' },
  { index: 5, hex: '#2e6bff', nameEn: 'Blue', nameZhTW: '藍' },
  { index: 6, hex: '#b833ff', nameEn: 'Purple', nameZhTW: '紫' },
];

export const SLEEP_TIMER_OPTIONS: readonly { seconds: number; step: number; labelEn: string; labelZhTW: string }[] = [
  { seconds: 0, step: 0, labelEn: 'Never', labelZhTW: '永不休眠' },
  { seconds: 60, step: 2, labelEn: '1 min', labelZhTW: '1 分鐘' },
  { seconds: 90, step: 3, labelEn: '1.5 min', labelZhTW: '1.5 分鐘' },
  { seconds: 120, step: 4, labelEn: '2 min', labelZhTW: '2 分鐘' },
  { seconds: 180, step: 6, labelEn: '3 min', labelZhTW: '3 分鐘' },
  { seconds: 240, step: 8, labelEn: '4 min', labelZhTW: '4 分鐘' },
  { seconds: 300, step: 10, labelEn: '5 min', labelZhTW: '5 分鐘' },
  { seconds: 600, step: 20, labelEn: '10 min', labelZhTW: '10 分鐘' },
  { seconds: 900, step: 30, labelEn: '15 min', labelZhTW: '15 分鐘' },
  { seconds: 1200, step: 40, labelEn: '20 min', labelZhTW: '20 分鐘' },
];

const STD_HID_LIST: readonly [number, string, string, string][] = [
  [0x04, 'A', 'A', 'A'], [0x05, 'B', 'B', 'B'], [0x06, 'C', 'C', 'C'], [0x07, 'D', 'D', 'D'],
  [0x08, 'E', 'E', 'E'], [0x09, 'F', 'F', 'F'], [0x0a, 'G', 'G', 'G'], [0x0b, 'H', 'H', 'H'],
  [0x0c, 'I', 'I', 'I'], [0x0d, 'J', 'J', 'J'], [0x0e, 'K', 'K', 'K'], [0x0f, 'L', 'L', 'L'],
  [0x10, 'M', 'M', 'M'], [0x11, 'N', 'N', 'N'], [0x12, 'O', 'O', 'O'], [0x13, 'P', 'P', 'P'],
  [0x14, 'Q', 'Q', 'Q'], [0x15, 'R', 'R', 'R'], [0x16, 'S', 'S', 'S'], [0x17, 'T', 'T', 'T'],
  [0x18, 'U', 'U', 'U'], [0x19, 'V', 'V', 'V'], [0x1a, 'W', 'W', 'W'], [0x1b, 'X', 'X', 'X'],
  [0x1c, 'Y', 'Y', 'Y'], [0x1d, 'Z', 'Z', 'Z'],
  [0x1e, '1', '1', '1'], [0x1f, '2', '2', '2'], [0x20, '3', '3', '3'], [0x21, '4', '4', '4'],
  [0x22, '5', '5', '5'], [0x23, '6', '6', '6'], [0x24, '7', '7', '7'], [0x25, '8', '8', '8'],
  [0x26, '9', '9', '9'], [0x27, '0', '0', '0'],
  [0x28, 'Enter', 'Enter', 'Enter'],
  [0x29, 'Esc', 'Esc', 'Esc'],
  [0x2a, 'Backspace', 'Backspace', 'Bksp'],
  [0x2b, 'Tab', 'Tab', 'Tab'],
  [0x2c, 'Space', '空白鍵', 'Space'],
  [0x2d, '-', '-', '-'],
  [0x2e, '=', '=', '='],
  [0x2f, '[', '[', '['],
  [0x30, ']', ']', ']'],
  [0x31, '\\', '\\', '\\'],
  [0x33, ';', ';', ';'],
  [0x34, "'", "'", "'"],
  [0x35, '`', '`', '`'],
  [0x36, ',', ',', ','],
  [0x37, '.', '.', '.'],
  [0x38, '/', '/', '/'],
  [0x39, 'Caps Lock', 'Caps Lock', 'Caps'],
  [0x3a, 'F1', 'F1', 'F1'], [0x3b, 'F2', 'F2', 'F2'], [0x3c, 'F3', 'F3', 'F3'], [0x3d, 'F4', 'F4', 'F4'],
  [0x3e, 'F5', 'F5', 'F5'], [0x3f, 'F6', 'F6', 'F6'], [0x40, 'F7', 'F7', 'F7'], [0x41, 'F8', 'F8', 'F8'],
  [0x42, 'F9', 'F9', 'F9'], [0x43, 'F10', 'F10', 'F10'], [0x44, 'F11', 'F11', 'F11'], [0x45, 'F12', 'F12', 'F12'],
  [0x46, 'Print Screen', '螢幕截圖', 'PrtSc'],
  [0x47, 'Scroll Lock', 'Scroll Lock', 'ScrLk'],
  [0x48, 'Pause', 'Pause', 'Pause'],
  [0x49, 'Insert', 'Insert', 'Ins'],
  [0x4a, 'Home', 'Home', 'Home'],
  [0x4b, 'Page Up', 'Page Up', 'PgUp'],
  [0x4c, 'Delete', 'Delete', 'Del'],
  [0x4d, 'End', 'End', 'End'],
  [0x4e, 'Page Down', 'Page Down', 'PgDn'],
  [0x4f, 'Right', '右', 'Right'],
  [0x50, 'Left', '左', 'Left'],
  [0x51, 'Down', '下', 'Down'],
  [0x52, 'Up', '上', 'Up'],
  [0x65, 'Menu', '選單鍵', 'Menu'],
];

const MOD_HID_LIST: readonly [number, string, string, string][] = [
  [0xe0, 'Left Ctrl', '左 Ctrl', 'LCtrl'],
  [0xe1, 'Left Shift', '左 Shift', 'LShift'],
  [0xe2, 'Left Alt', '左 Alt', 'LAlt'],
  [0xe3, 'Left Win', '左 Win', 'LWin'],
  [0xe4, 'Right Ctrl', '右 Ctrl', 'RCtrl'],
  [0xe5, 'Right Shift', '右 Shift', 'RShift'],
  [0xe6, 'Right Alt', '右 Alt', 'RAlt'],
  [0xe7, 'Right Win', '右 Win', 'RWin'],
];

const CONSUMER_LIST: readonly [number, string, string, string][] = [
  [0x006f, 'Screen Brightness +', '螢幕亮度 +', 'Bri+'],
  [0x0070, 'Screen Brightness -', '螢幕亮度 -', 'Bri-'],
  [0x00b5, 'Next Track', '下一首', 'Next'],
  [0x00b6, 'Previous Track', '上一首', 'Prev'],
  [0x00b7, 'Stop', '停止播放', 'Stop'],
  [0x00cd, 'Play / Pause', '播放 / 暫停', 'Play'],
  [0x00e2, 'Mute', '靜音', 'Mute'],
  [0x00e9, 'Volume +', '音量 +', 'Vol+'],
  [0x00ea, 'Volume -', '音量 -', 'Vol-'],
  [0x018a, 'Mail', '郵件', 'Mail'],
  [0x0192, 'Calculator', '小算盤', 'Calc'],
  [0x0194, 'My Computer', '本機', 'PC'],
  [0x0221, 'Search', '搜尋', 'Search'],
  [0x0223, 'Browser Home', '瀏覽器首頁', 'Home'],
];

const FIRMWARE_LIST: readonly [number, string, string, string][] = [
  [0x07000001, 'Win Lock', '鎖定 Win 鍵', 'WinLk'],
  [0x07000004, 'Factory Reset', '恢復原廠設定', 'Reset'],
  [0x07000018, 'Windows Mode', 'Windows 模式', 'WinMode'],
  [0x07000019, 'Android Mode', 'Android 模式', 'AndMode'],
  [0x0700001a, 'macOS Mode', 'macOS 模式', 'MacMode'],
  [0x0700001b, 'iOS Mode', 'iOS 模式', 'iOSMode'],
  [0x0700001c, 'Show Battery', '查詢電量', 'Batt'],
  [0x0700001d, 'Knob Volume / Mute', '旋鈕音量 / 靜音', 'KnobVol'],
  [0x08000000, 'Backlight On/Off', '背光開關', 'LedTog'],
  [0x08020000, 'Next Effect', '切換燈效', 'LedMode'],
  [0x08030100, 'Backlight Brightness +', '燈效亮度 +', 'LedBri+'],
  [0x08030200, 'Backlight Brightness -', '燈效亮度 -', 'LedBri-'],
  [0x08040100, 'Backlight Speed +', '燈效速度 +', 'LedSpd+'],
  [0x08040200, 'Backlight Speed -', '燈效速度 -', 'LedSpd-'],
];

export const KEYCODE_CATALOG: readonly KeycodeCatalogEntry[] = [
  ...STD_HID_LIST.map(([hidUsage, labelEn, labelZhTW, shortLabel]) => ({
    code4B: encodeStdKey4B(hidUsage, 0),
    group: 'standard' as const,
    hidUsage,
    labelEn,
    labelZhTW,
    shortLabel,
  })),
  ...MOD_HID_LIST.map(([hidUsage, labelEn, labelZhTW, shortLabel]) => ({
    code4B: encodeStdKey4B(hidUsage, 0),
    group: 'modifier' as const,
    hidUsage,
    labelEn,
    labelZhTW,
    shortLabel,
  })),
  ...CONSUMER_LIST.map(([usage, labelEn, labelZhTW, shortLabel]) => ({
    code4B: encodeConsumer4B(usage),
    group: 'consumer' as const,
    labelEn,
    labelZhTW,
    shortLabel,
  })),
  ...FIRMWARE_LIST.map(([code4B, labelEn, labelZhTW, shortLabel]) => ({
    code4B: code4B >>> 0,
    group: 'firmware' as const,
    labelEn,
    labelZhTW,
    shortLabel,
  })),
  {
    code4B: KEY_ENTRY_FN,
    group: 'special',
    labelEn: 'FN Key',
    labelZhTW: 'FN 鍵',
    shortLabel: 'FN',
  },
  {
    code4B: KEY_ENTRY_DISABLED,
    group: 'special',
    labelEn: 'Disabled / Pass-through',
    labelZhTW: '停用 / 透傳',
    shortLabel: '—',
  },
];

const CATALOG_BY_CODE = new Map<number, KeycodeCatalogEntry>(
  KEYCODE_CATALOG.map((entry) => [entry.code4B >>> 0, entry])
);

export function formatKeycodeLabel(
  code4B: number,
  locale: 'zh-TW' | 'en' = 'en',
  short = false
): string {
  const normalized = code4B >>> 0;
  const exact = CATALOG_BY_CODE.get(normalized);
  if (exact) {
    if (short) return exact.shortLabel;
    return locale === 'zh-TW' ? exact.labelZhTW : exact.labelEn;
  }

  const b0 = (normalized >>> 24) & 0xff;
  const b1 = (normalized >>> 16) & 0xff;
  const b2 = (normalized >>> 8) & 0xff;
  const b3 = normalized & 0xff;

  if (b0 === 0x00 && b2 === 0x00 && b1 !== 0) {
    const mods: string[] = [];
    if (b1 & (MODIFIER_BITS.LCTRL | MODIFIER_BITS.RCTRL)) mods.push('Ctrl');
    if (b1 & (MODIFIER_BITS.LSHIFT | MODIFIER_BITS.RSHIFT)) mods.push('Shift');
    if (b1 & (MODIFIER_BITS.LALT | MODIFIER_BITS.RALT)) mods.push('Alt');
    if (b1 & (MODIFIER_BITS.LWIN | MODIFIER_BITS.RWIN)) mods.push('Win');
    const base = CATALOG_BY_CODE.get(b3 >>> 0);
    const keyLabel = base
      ? short
        ? base.shortLabel
        : locale === 'zh-TW'
          ? base.labelZhTW
          : base.labelEn
      : `0x${b3.toString(16).toUpperCase().padStart(2, '0')}`;
    return `${mods.join('+')}+${keyLabel}`;
  }

  return `0x${normalized.toString(16).toUpperCase().padStart(8, '0')}`;
}
