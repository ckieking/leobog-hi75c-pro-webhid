import { describe, expect, it } from 'vitest';
import {
  HI75C_KEYS,
  HI75C_KEY_BY_ID,
  HI75C_KEY_BY_MATRIX,
  KEYCODE_CATALOG,
  KEY_ENTRY_FN,
  LIGHTING_EFFECTS,
  MODIFIER_BITS,
  encodeStdKey4B,
  formatKeycodeLabel,
} from '../src/data/hi75cLayout';
import {
  PROFILE_DEVICE_NAME,
  PROFILE_SCHEMA_VERSION,
  parseProfile,
  serializeProfile,
  validateProfile,
  type Hi75cProfile,
} from '../src/data/profileSchema';
import { MESSAGES } from '../src/i18n/messages';

function makeValidProfile(): Hi75cProfile {
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    device: PROFILE_DEVICE_NAME,
    exportedAt: '2026-11-13T12:00:00.000Z',
    keymap: {
      base: { K1: 0x00000029, K76: KEY_ENTRY_FN },
      fn1: { K1: 0x07000004 },
    },
    lighting: {
      effectId: 1,
      brightness: 7,
      speed: 2,
      colorIndex: 4,
      multicolor: false,
      customFlag: false,
      winLock: false,
      sleepSeconds: 120,
      customColor: [255, 128, 0],
    },
    perKeyRgb: {
      K1: [255, 0, 0],
      K82: [0, 255, 128],
    },
  };
}

describe('hi75cLayout', () => {
  it('defines exactly 82 unique keys with unique matrix indices', () => {
    expect(HI75C_KEYS).toHaveLength(82);

    const ids = new Set(HI75C_KEYS.map((k) => k.id));
    const matrices = new Set(HI75C_KEYS.map((k) => k.matrixIndex));

    expect(ids.size).toBe(82);
    expect(matrices.size).toBe(82);

    for (const key of HI75C_KEYS) {
      expect(key.matrixIndex).toBeGreaterThanOrEqual(0);
      expect(key.matrixIndex).toBeLessThan(126);
      expect(key.x).toBeGreaterThanOrEqual(0);
      expect(key.y).toBeGreaterThanOrEqual(0);
      expect(key.w).toBeGreaterThan(0);
      expect(key.h).toBeGreaterThan(0);
    }
  });

  it('maps RAlt=53, FN=59, and K82 Knob=84', () => {
    expect(HI75C_KEY_BY_ID.get('K75')?.matrixIndex).toBe(53);
    expect(HI75C_KEY_BY_ID.get('K76')?.matrixIndex).toBe(59);
    expect(HI75C_KEY_BY_ID.get('K76')?.defaultBase4B).toBe(KEY_ENTRY_FN);
    expect(HI75C_KEY_BY_ID.get('K82')?.matrixIndex).toBe(84);
    expect(HI75C_KEY_BY_ID.get('K82')?.defaultBase4B).toBe(0x0700001d);
    expect(HI75C_KEY_BY_MATRIX.get(53)?.id).toBe('K75');
    expect(HI75C_KEY_BY_MATRIX.get(59)?.id).toBe('K76');
    expect(HI75C_KEY_BY_MATRIX.get(84)?.id).toBe('K82');
  });

  it('defines 17 valid hardware lighting effects with zh-TW and en names', () => {
    expect(LIGHTING_EFFECTS).toHaveLength(17);
    const ids = new Set(LIGHTING_EFFECTS.map((e) => e.id));
    const hwIds = new Set(LIGHTING_EFFECTS.map((e) => e.hwEffectId));
    expect(ids.size).toBe(17);
    expect(hwIds.size).toBe(17);
    for (const effect of LIGHTING_EFFECTS) {
      expect(effect.nameEn.trim().length).toBeGreaterThan(0);
      expect(effect.nameZhTW.trim().length).toBeGreaterThan(0);
    }
  });

  it('formats standard, modifier combo, consumer, and firmware keycodes', () => {
    expect(KEYCODE_CATALOG.length).toBeGreaterThan(80);
    expect(formatKeycodeLabel(0x00000029, 'en')).toBe('Esc');
    expect(formatKeycodeLabel(encodeStdKey4B(0x06, MODIFIER_BITS.LCTRL), 'en')).toBe('Ctrl+C');
    expect(formatKeycodeLabel(0x020000e9, 'zh-TW')).toBe('音量 +');
    expect(formatKeycodeLabel(0x0700001d, 'en')).toBe('Knob Volume / Mute');
  });
});

describe('profileSchema', () => {
  it('accepts and round-trips a valid profile including per-key effectId 32', () => {
    const profile = makeValidProfile();
    const json = serializeProfile(profile);
    expect(validateProfile(json)).toBe(true);
    expect(parseProfile(json)).toEqual(profile);

    const perKey = makeValidProfile();
    perKey.lighting.effectId = 32;
    perKey.lighting.customFlag = true;
    expect(validateProfile(serializeProfile(perKey))).toBe(true);
    expect(parseProfile(serializeProfile(perKey))).toEqual(perKey);
  });

  it('rejects malformed or out-of-range profiles', () => {
    const base = makeValidProfile();

    expect(validateProfile(null)).toBe(false);
    expect(validateProfile('not-json')).toBe(false);
    expect(validateProfile({ ...base, schemaVersion: 2 })).toBe(false);
    expect(validateProfile({ ...base, device: 'Other Keyboard' })).toBe(false);
    expect(validateProfile({ ...base, exportedAt: 'invalid-date' })).toBe(false);

    expect(
      validateProfile({
        ...base,
        keymap: { ...base.keymap, base: { K999: 0x00000004 } },
      })
    ).toBe(false);

    expect(
      validateProfile({
        ...base,
        keymap: { ...base.keymap, base: { K1: -1 } },
      })
    ).toBe(false);

    expect(
      validateProfile({
        ...base,
        lighting: { ...base.lighting, brightness: 10 },
      })
    ).toBe(false);

    expect(
      validateProfile({
        ...base,
        lighting: { ...base.lighting, sleepSeconds: 45 },
      })
    ).toBe(false);

    expect(
      validateProfile({
        ...base,
        perKeyRgb: { K1: [256, 0, 0] },
      })
    ).toBe(false);

    expect(() => parseProfile({ ...base, schemaVersion: 99 })).toThrow();
  });
});

describe('i18n messages', () => {
  it('provides complete zh-TW and en message sets', () => {
    expect(MESSAGES['zh-TW'].tabs.keymap).toBe('改鍵');
    expect(MESSAGES['zh-TW'].tabs.lighting).toBe('燈效');
    expect(MESSAGES['zh-TW'].titleConnected(85)).toBe('[85%] LEOBOG Hi75C Pro');
    expect(MESSAGES['zh-TW'].titleAsleep(85)).toBe('[休眠 · 85%] LEOBOG Hi75C Pro');
    expect(MESSAGES.en.titleConnected(85)).toBe('[85%] LEOBOG Hi75C Pro');
  });
});
