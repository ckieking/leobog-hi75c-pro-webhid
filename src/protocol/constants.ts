/**
 * LEOBOG Hi75C Pro 2.4G wireless receiver & WebHID protocol constants.
 */

export const VENDOR_ID = 0x3554;
export const PRODUCT_ID = 0xfa09;
export const USAGE_PAGE = 0xff02;
export const USAGE = 0x0002;
export const REPORT_ID = 0x13;

export const HID_FILTERS: HIDDeviceFilter[] = [
  {
    vendorId: VENDOR_ID,
    productId: PRODUCT_ID,
    usagePage: USAGE_PAGE,
    usage: USAGE,
  },
];

/** WebHID sendReport(0x13, body19) and inputreport.data omit byte[0] (Report ID 0x13). */
export const BODY_LENGTH = 19;
export const FULL_FRAME_LENGTH = 20;
export const PACKET_PAYLOAD_SIZE = 14;
export const CHECKSUM_INDEX = 18;
export const ERROR_BIT = 0x80;

export const CMD = {
  PSD: 0x05,
  WRITE_KEYMAP: 0x01,
  READ_KEYMAP: 0x41,
  WRITE_RGB: 0x02,
  READ_RGB: 0x42,
  WRITE_CFG: 0x04,
  READ_CFG: 0x44,
  WRITE_PALETTE: 0x09,
  READ_PALETTE: 0x49,
  BATTERY_ALT: 0xca,
  BATTERY: 0x4a,
} as const;

export type CommandCode = (typeof CMD)[keyof typeof CMD];

export const KEYMAP_KEY_COUNT = 126;
export const KEYMAP_ENTRY_SIZE = 4;
export const KEYMAP_SIZE = KEYMAP_KEY_COUNT * KEYMAP_ENTRY_SIZE; // 504 bytes

export const KEYMAP_LAYER = {
  BASE: 0,
  FN1: 1,
} as const;

export type KeymapLayer = (typeof KEYMAP_LAYER)[keyof typeof KEYMAP_LAYER];

export const RGB_SIZE = KEYMAP_KEY_COUNT * 3; // 378 bytes planar R[126] G[126] B[126]

export const CFG_SIZE = 128;
export const CFG_MAGIC_0 = 0x5a;
export const CFG_MAGIC_1 = 0xa5;

export const CFG_OFFSET = {
  CUSTOM_FLAG: 9,
  EFFECT_ID: 10,
  WIN_LOCK: 15,
  SLEEP_STEP: 24,
  EFFECT_SLOTS_BASE: 58,
  MAGIC_0: 126,
  MAGIC_1: 127,
} as const;

export const SLEEP_STEPS = [0, 2, 3, 4, 6, 8, 10, 20, 30, 40] as const;
export const SLEEP_STEP_SECONDS = 30;
export const SLEEP_SECONDS_OPTIONS = [0, 60, 90, 120, 180, 240, 300, 600, 900, 1200] as const;

export const PALETTE_EFFECT_COUNT = 23;
export const PALETTE_COLORS_PER_EFFECT = 7;
export const PALETTE_TAIL_SIZE = 7;
export const PALETTE_SIZE = PALETTE_EFFECT_COUNT * PALETTE_COLORS_PER_EFFECT * 3 + PALETTE_TAIL_SIZE; // 490 bytes

export const BATTERY_CHARGING_FLAG = 0x10;

export const KEY_TYPE = {
  STD: 0x00,
  CONSUMER: 0x02,
  FW: 0x07,
  FN_FX: 0x08,
  FN: 0x0d,
} as const;

export const MODIFIER_BIT = {
  LCTRL: 0x01,
  LSHIFT: 0x02,
  LALT: 0x04,
  LWIN: 0x08,
  RCTRL: 0x10,
  RSHIFT: 0x20,
  RALT: 0x40,
  RWIN: 0x80,
} as const;

export const WRITE_INTER_PACKET_GAP_MS = 15;
export const POST_WRITE_SETTLE_MS = 400;
export const READ_TIMEOUT_MS = 350;
export const READ_MAX_ATTEMPTS = 3;
