import { describe, expect, it } from "vitest";
import {
  CFG_MAGIC_0,
  CFG_MAGIC_1,
  CFG_OFFSET,
  CFG_SIZE,
  KEYMAP_KEY_COUNT,
  KEYMAP_SIZE,
  MODIFIER_BIT,
  PALETTE_COLORS_PER_EFFECT,
  PALETTE_EFFECT_COUNT,
  PALETTE_SIZE,
  RGB_SIZE,
  SLEEP_STEPS,
} from "../src/protocol/constants.ts";
import {
  createConsumerKeyEntry,
  createFnFxKeyEntry,
  createFnKeyEntry,
  createFwKeyEntry,
  createStdKeyEntry,
  decodeBattery,
  decodeConfig,
  decodeKeyEntry,
  decodeKeymap,
  decodePalette,
  decodeRgbMap,
  encodeConfig,
  encodeKeyEntry,
  encodeKeymap,
  encodePalette,
  encodeRgbMap,
  sleepSecondsToStep,
  stepToSleepSeconds,
} from "../src/protocol/codecs.ts";

describe("battery codec", () => {
  it("decodes percent, flags, and charging bit (0x10)", () => {
    expect(decodeBattery(Uint8Array.from([100, 0x01]))).toEqual({
      percent: 100,
      flags: 0x01,
      charging: false,
    });
    expect(decodeBattery(Uint8Array.from([72, 0x11]))).toEqual({
      percent: 72,
      flags: 0x11,
      charging: true,
    });
  });
});

describe("config Read-Modify-Write codec", () => {
  it("preserves unknown raw bytes and 5A A5 magic while updating known fields", () => {
    const raw = new Uint8Array(CFG_SIZE);
    for (let i = 0; i < CFG_SIZE; i++) {
      raw[i] = (i * 7 + 3) & 0xff;
    }
    raw[CFG_OFFSET.CUSTOM_FLAG] = 0;
    raw[CFG_OFFSET.EFFECT_ID] = 10;
    raw[CFG_OFFSET.WIN_LOCK] = 0;
    raw[CFG_OFFSET.SLEEP_STEP] = 4; // 120s
    raw[CFG_OFFSET.EFFECT_SLOTS_BASE + 10 * 2] = 7;
    raw[CFG_OFFSET.EFFECT_SLOTS_BASE + 10 * 2 + 1] = (3 << 4) | 5;
    raw[CFG_OFFSET.MAGIC_0] = CFG_MAGIC_0;
    raw[CFG_OFFSET.MAGIC_1] = CFG_MAGIC_1;

    const cfg = decodeConfig(raw);
    expect(cfg.customFlag).toBe(false);
    expect(cfg.effectId).toBe(10);
    expect(cfg.winLock).toBe(false);
    expect(cfg.sleepStep).toBe(4);
    expect(cfg.sleepSeconds).toBe(120);
    expect(cfg.slots[10]).toEqual({ brightness: 7, speed: 3, color: 5 });

    cfg.customFlag = true;
    cfg.effectId = 15;
    cfg.winLock = true;
    cfg.sleepStep = sleepSecondsToStep(600); // 20
    cfg.slots[15] = { brightness: 9, speed: 4, color: 7 };

    const encoded = encodeConfig(cfg);
    expect(encoded.length).toBe(CFG_SIZE);
    expect(encoded[CFG_OFFSET.CUSTOM_FLAG]).toBe(1);
    expect(encoded[CFG_OFFSET.EFFECT_ID]).toBe(15);
    expect(encoded[CFG_OFFSET.WIN_LOCK]).toBe(1);
    expect(encoded[CFG_OFFSET.SLEEP_STEP]).toBe(20);
    expect(encoded[CFG_OFFSET.EFFECT_SLOTS_BASE + 15 * 2]).toBe(9);
    expect(encoded[CFG_OFFSET.EFFECT_SLOTS_BASE + 15 * 2 + 1]).toBe((4 << 4) | 7);
    expect(encoded[126]).toBe(0x5a);
    expect(encoded[127]).toBe(0xa5);

    // Unrelated raw bytes must be untouched
    expect(encoded[0]).toBe(raw[0]);
    expect(encoded[8]).toBe(raw[8]);
    expect(encoded[25]).toBe(raw[25]);
    expect(encoded[125]).toBe(raw[125]);
  });

  it("maps valid sleep steps and rejects invalid config magic", () => {
    for (const step of SLEEP_STEPS) {
      expect(sleepSecondsToStep(stepToSleepSeconds(step))).toBe(step);
    }

    const bad = new Uint8Array(CFG_SIZE);
    expect(() => decodeConfig(bad)).toThrow();
    expect(() => decodeConfig(new Uint8Array(10))).toThrow();
  });
});

describe("planar 378B RGB codec", () => {
  it("encodes and decodes planar R[126]G[126]B[126]", () => {
    const colors = Array.from({ length: KEYMAP_KEY_COUNT }, (_, i) => ({
      r: (i * 2) & 0xff,
      g: (i * 3 + 10) & 0xff,
      b: (255 - i) & 0xff,
    }));

    const raw = encodeRgbMap(colors);
    expect(raw.length).toBe(RGB_SIZE);
    expect(raw[5]).toBe(colors[5].r);
    expect(raw[126 + 5]).toBe(colors[5].g);
    expect(raw[252 + 5]).toBe(colors[5].b);

    const decoded = decodeRgbMap(raw);
    expect(decoded).toEqual(colors);
  });
});

describe("490B palette codec", () => {
  it("round-trips 23x7 RGB colors and preserves the 7-byte tail", () => {
    const raw = new Uint8Array(PALETTE_SIZE);
    for (let i = 0; i < PALETTE_SIZE; i++) {
      raw[i] = (i * 11) & 0xff;
    }

    const palette = decodePalette(raw);
    expect(palette.effects).toHaveLength(PALETTE_EFFECT_COUNT);
    expect(palette.effects[0]).toHaveLength(PALETTE_COLORS_PER_EFFECT);
    expect(palette.tail.length).toBe(7);

    palette.effects[2][4] = { r: 12, g: 34, b: 56 };
    const reencoded = encodePalette(palette);
    expect(reencoded.length).toBe(PALETTE_SIZE);
    expect(reencoded.slice(483, 490)).toEqual(raw.slice(483, 490));

    const redecoded = decodePalette(reencoded);
    expect(redecoded.effects[2][4]).toEqual({ r: 12, g: 34, b: 56 });
  });
});

describe("4B keymap entry codec", () => {
  it("decodes and encodes std, consumer, fw, fn_fx, fn, and preserves unknown bytes", () => {
    // Alt+Tab: 00 04 00 2B
    const altTab = decodeKeyEntry(Uint8Array.from([0x00, MODIFIER_BIT.LALT, 0x99, 0x2b]));
    expect(altTab.kind).toBe("std");
    expect(encodeKeyEntry(altTab)).toEqual([0x00, 0x04, 0x99, 0x2b]);

    // Consumer Vol+: 02 00 00 E9
    const volUp = decodeKeyEntry(Uint8Array.from([0x02, 0x55, 0x00, 0xe9]));
    expect(volUp.kind).toBe("consumer");
    if (volUp.kind === "consumer") {
      expect(volUp.usage).toBe(0x00e9);
    }
    expect(encodeKeyEntry(volUp)).toEqual([0x02, 0x55, 0x00, 0xe9]);

    // FW Knob: 07 00 00 1D
    const knob = createFwKeyEntry(0x00001d);
    expect(encodeKeyEntry(knob)).toEqual([0x07, 0x00, 0x00, 0x1d]);
    expect(decodeKeyEntry(Uint8Array.from([0x07, 0x00, 0x00, 0x1d]))).toEqual(knob);

    // FN-FX: 08 03 02 00
    const fnFx = createFnFxKeyEntry(0x03, 0x02, 0x00);
    expect(encodeKeyEntry(fnFx)).toEqual([0x08, 0x03, 0x02, 0x00]);
    expect(decodeKeyEntry(Uint8Array.from([0x08, 0x03, 0x02, 0x00]))).toEqual(fnFx);

    // FN: 0D 01 02 03
    const fnKey = decodeKeyEntry(Uint8Array.from([0x0d, 0x01, 0x02, 0x03]));
    expect(fnKey.kind).toBe("fn");
    expect(encodeKeyEntry(fnKey)).toEqual([0x0d, 0x01, 0x02, 0x03]);

    // Unknown: AA 11 22 33
    const unk = decodeKeyEntry(Uint8Array.from([0xaa, 0x11, 0x22, 0x33]));
    expect(unk.kind).toBe("unknown");
    expect(encodeKeyEntry(unk)).toEqual([0xaa, 0x11, 0x22, 0x33]);

    // Full 504B keymap round-trip
    const entries = Array.from({ length: KEYMAP_KEY_COUNT }, (_, i) => {
      if (i === 0) return createStdKeyEntry(0x29);
      if (i === 1) return createConsumerKeyEntry(0x00cd);
      if (i === 59) return createFnKeyEntry();
      return createStdKeyEntry(0x04 + (i % 26));
    });
    const raw504 = encodeKeymap(entries);
    expect(raw504.length).toBe(KEYMAP_SIZE);
    expect(decodeKeymap(raw504)).toEqual(entries);
  });
});
