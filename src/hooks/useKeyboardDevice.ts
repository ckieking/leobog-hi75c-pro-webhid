import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  HI75C_KEYS,
  HI75C_KEY_BY_ID,
  KEY_ENTRY_FN,
  LIGHTING_EFFECTS,
  RGB_COLOR_PRESETS,
} from '../data/hi75cLayout';
import {
  PROFILE_DEVICE_NAME,
  PROFILE_SCHEMA_VERSION,
  parseProfile,
  serializeProfile,
  type Hi75cProfile,
  type RgbTuple,
} from '../data/profileSchema';
import type { Messages } from '../i18n/messages';
import {
  CFG_SLOT_COUNT,
  decodeKeyEntry,
  encodeKeyEntry,
  keyEntryEquals,
  sleepSecondsToStep,
  type BatteryStatus,
  type DeviceConfig,
  type EffectSlotConfig,
  type KeyEntry,
  type PaletteData,
  type RgbColor,
} from '../protocol/codecs';
import {
  CFG_SIZE,
  KEYMAP_KEY_COUNT,
  KEYMAP_LAYER,
  PALETTE_COLORS_PER_EFFECT,
  PALETTE_EFFECT_COUNT,
  PALETTE_SIZE,
  PALETTE_TAIL_SIZE,
} from '../protocol/constants';
import {
  DeviceAsleepError,
  HidClient,
  getConnectedHi75cDevices,
  isMatchingHi75cInterface,
  isWebHidSupported,
  requestHi75cDevice,
} from '../protocol/hidClient';

export type ConnectionState = 'unsupported' | 'disconnected' | 'connecting' | 'syncing' | 'connected';

export interface KeyboardSnapshot {
  baseKeymap: KeyEntry[];
  fn1Keymap: KeyEntry[];
  rgbMap: RgbColor[];
  config: DeviceConfig;
  palette: PaletteData;
}

const BACKUP_STORAGE_KEY = 'leobog-hi75c-last-backup';
const BATTERY_POLL_MS = 30_000;

function uint32ToKeyEntry(code4B: number): KeyEntry {
  const bytes = new Uint8Array([
    (code4B >>> 24) & 0xff,
    (code4B >>> 16) & 0xff,
    (code4B >>> 8) & 0xff,
    code4B & 0xff,
  ]);
  return decodeKeyEntry(bytes, 0);
}

export function keyEntryToUint32(entry: KeyEntry): number {
  const [b0, b1, b2, b3] = encodeKeyEntry(entry);
  return (((b0 & 0xff) << 24) | ((b1 & 0xff) << 16) | ((b2 & 0xff) << 8) | (b3 & 0xff)) >>> 0;
}

function hexToRgb(hex: string): RgbColor {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16) || 0,
    g: parseInt(clean.slice(2, 4), 16) || 0,
    b: parseInt(clean.slice(4, 6), 16) || 0,
  };
}

function createDefaultSnapshot(): KeyboardSnapshot {
  const baseKeymap: KeyEntry[] = Array.from({ length: KEYMAP_KEY_COUNT }, () =>
    uint32ToKeyEntry(0)
  );
  const fn1Keymap: KeyEntry[] = Array.from({ length: KEYMAP_KEY_COUNT }, () =>
    uint32ToKeyEntry(0)
  );
  for (const key of HI75C_KEYS) {
    baseKeymap[key.matrixIndex] = uint32ToKeyEntry(key.defaultBase4B);
    fn1Keymap[key.matrixIndex] = uint32ToKeyEntry(key.defaultFn4B);
  }

  const rgbMap: RgbColor[] = Array.from({ length: KEYMAP_KEY_COUNT }, () => ({
    r: 56,
    g: 189,
    b: 248,
  }));

  const rawCfg = new Uint8Array(CFG_SIZE);
  rawCfg[126] = 0x5a;
  rawCfg[127] = 0xa5;
  const slots: EffectSlotConfig[] = Array.from({ length: CFG_SLOT_COUNT }, () => ({
    brightness: 7,
    speed: 2,
    color: 7,
  }));

  const config: DeviceConfig = {
    customFlag: false,
    effectId: 1,
    winLock: false,
    sleepStep: 10,
    sleepSeconds: 300,
    slots,
    raw: rawCfg,
  };

  const presetColors = RGB_COLOR_PRESETS.map((p) => hexToRgb(p.hex));
  const effects: RgbColor[][] = Array.from({ length: PALETTE_EFFECT_COUNT }, () =>
    presetColors.map((c) => ({ ...c }))
  );
  const palette: PaletteData = {
    effects,
    tail: new Uint8Array(PALETTE_TAIL_SIZE),
    raw: new Uint8Array(PALETTE_SIZE),
  };

  return { baseKeymap, fn1Keymap, rgbMap, config, palette };
}

function cloneSnapshot(snap: KeyboardSnapshot): KeyboardSnapshot {
  return {
    baseKeymap: snap.baseKeymap.map((e) => ({ ...e, raw: [...e.raw] as [number, number, number, number] })),
    fn1Keymap: snap.fn1Keymap.map((e) => ({ ...e, raw: [...e.raw] as [number, number, number, number] })),
    rgbMap: snap.rgbMap.map((c) => ({ ...c })),
    config: {
      ...snap.config,
      slots: snap.config.slots.map((s) => ({ ...s })),
      raw: snap.config.raw.slice(),
    },
    palette: {
      effects: snap.palette.effects.map((row) => row.map((c) => ({ ...c }))),
      tail: snap.palette.tail.slice(),
      raw: snap.palette.raw.slice(),
    },
  };
}

function rgbEqual(a: RgbColor, b: RgbColor): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b;
}

export function useKeyboardDevice(t: Messages) {
  const webHidSupported = isWebHidSupported();
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    webHidSupported ? 'disconnected' : 'unsupported'
  );
  const [isAsleep, setIsAsleep] = useState(false);
  const [battery, setBattery] = useState<BatteryStatus | null>(null);
  const [psd, setPsd] = useState<Uint8Array | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const initialDefault = useMemo(() => createDefaultSnapshot(), []);
  const [synced, setSynced] = useState<KeyboardSnapshot>(initialDefault);
  const [draft, setDraft] = useState<KeyboardSnapshot>(() => cloneSnapshot(initialDefault));

  const clientRef = useRef<HidClient | null>(null);
  const deviceRef = useRef<HIDDevice | null>(null);
  const busyRef = useRef(false);
  const hasSyncedDeviceRef = useRef(false);

  const syncDevice = useCallback(
    async (hidDevice: HIDDevice) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setConnectionState('syncing');
      setErrorMessage(null);

      try {
        const client = new HidClient(hidDevice);
        await client.open();
        clientRef.current = client;
        deviceRef.current = hidDevice;

        const psdBytes = await client.readPsd();
        setPsd(psdBytes);

        try {
          const batt = await client.readBattery();
          setBattery(batt);
          setIsAsleep(false);
        } catch (err) {
          if (err instanceof DeviceAsleepError) {
            setIsAsleep(true);
          } else {
            throw err;
          }
        }

        const config = await client.readConfig();
        const baseKeymap = await client.readKeymap(KEYMAP_LAYER.BASE);
        const fn1Keymap = await client.readKeymap(KEYMAP_LAYER.FN1);
        const rgbMap = await client.readRgbMap();
        const palette = await client.readPalette();

        const fresh: KeyboardSnapshot = {
          baseKeymap,
          fn1Keymap,
          rgbMap,
          config,
          palette,
        };
        setSynced(fresh);
        setDraft(cloneSnapshot(fresh));
        hasSyncedDeviceRef.current = true;
        setConnectionState('connected');
      } catch (err) {
        if (err instanceof DeviceAsleepError) {
          setIsAsleep(true);
          if (hasSyncedDeviceRef.current) {
            setConnectionState('connected');
          } else {
            setErrorMessage(t.status.asleep);
            setConnectionState('disconnected');
          }
        } else {
          setErrorMessage(err instanceof Error ? err.message : t.feedback.syncError);
          setConnectionState('disconnected');
        }
      } finally {
        busyRef.current = false;
      }
    },
    [t.feedback.syncError]
  );

  const connect = useCallback(async () => {
    if (!webHidSupported) return;
    setConnectionState('connecting');
    setErrorMessage(null);
    try {
      const device = await requestHi75cDevice();
      if (!device) {
        setConnectionState('disconnected');
        return;
      }
      await syncDevice(device);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t.feedback.syncError);
      setConnectionState('disconnected');
    }
  }, [syncDevice, t.feedback.syncError, webHidSupported]);

  const refreshBattery = useCallback(async () => {
    const client = clientRef.current;
    if (!client || connectionState !== 'connected' || busyRef.current) return;
    try {
      const batt = await client.readBattery();
      setBattery(batt);
      setIsAsleep(false);
    } catch (err) {
      if (err instanceof DeviceAsleepError) {
        setIsAsleep(true);
      } else {
        setErrorMessage(err instanceof Error ? err.message : t.feedback.batteryError);
      }
    }
  }, [connectionState, t.feedback.batteryError]);

  // Auto-reconnect on mount + WebHID connect/disconnect listeners
  useEffect(() => {
    if (!webHidSupported) return;
    let cancelled = false;

    void getConnectedHi75cDevices().then((devices) => {
      if (!cancelled && devices.length > 0 && !deviceRef.current) {
        void syncDevice(devices[0]);
      }
    });

    const handleConnect = (ev: HIDConnectionEvent) => {
      if (isMatchingHi75cInterface(ev.device) && !deviceRef.current) {
        void syncDevice(ev.device);
      }
    };

    const handleDisconnect = (ev: HIDConnectionEvent) => {
      if (deviceRef.current === ev.device) {
        deviceRef.current = null;
        clientRef.current = null;
        hasSyncedDeviceRef.current = false;
        setConnectionState('disconnected');
        setIsAsleep(false);
      }
    };

    navigator.hid.addEventListener('connect', handleConnect);
    navigator.hid.addEventListener('disconnect', handleDisconnect);

    return () => {
      cancelled = true;
      navigator.hid.removeEventListener('connect', handleConnect);
      navigator.hid.removeEventListener('disconnect', handleDisconnect);
    };
  }, [syncDevice, webHidSupported]);

  // 30s + window focus battery polling
  useEffect(() => {
    if (connectionState !== 'connected') return;
    const intervalId = window.setInterval(() => {
      void refreshBattery();
    }, BATTERY_POLL_MS);
    const handleFocus = () => {
      void refreshBattery();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [connectionState, refreshBattery]);

  // Sync document.title
  useEffect(() => {
    if (connectionState === 'connected') {
      if (isAsleep) {
        document.title = t.titleAsleep(battery?.percent ?? null);
      } else if (battery) {
        document.title = t.titleConnected(battery.percent);
      } else {
        document.title = t.appName;
      }
    } else {
      document.title = t.appName;
    }
  }, [battery, connectionState, isAsleep, t]);

  // Dirty computation
  const diff = useMemo(() => {
    let baseChangedCount = 0;
    let fn1ChangedCount = 0;
    let rgbChangedCount = 0;

    for (const k of HI75C_KEYS) {
      const idx = k.matrixIndex;
      if (!keyEntryEquals(draft.baseKeymap[idx], synced.baseKeymap[idx])) baseChangedCount++;
      if (!keyEntryEquals(draft.fn1Keymap[idx], synced.fn1Keymap[idx])) fn1ChangedCount++;
      if (!rgbEqual(draft.rgbMap[idx], synced.rgbMap[idx])) rgbChangedCount++;
    }

    const configChanged =
      draft.config.customFlag !== synced.config.customFlag ||
      draft.config.effectId !== synced.config.effectId ||
      draft.config.winLock !== synced.config.winLock ||
      draft.config.sleepStep !== synced.config.sleepStep ||
      draft.config.slots.some(
        (s, i) =>
          s.brightness !== synced.config.slots[i]?.brightness ||
          s.speed !== synced.config.slots[i]?.speed ||
          s.color !== synced.config.slots[i]?.color
      );

    let paletteChanged = false;
    for (let e = 0; e < PALETTE_EFFECT_COUNT && !paletteChanged; e++) {
      for (let c = 0; c < PALETTE_COLORS_PER_EFFECT; c++) {
        if (!rgbEqual(draft.palette.effects[e][c], synced.palette.effects[e][c])) {
          paletteChanged = true;
          break;
        }
      }
    }

    const totalPending =
      baseChangedCount +
      fn1ChangedCount +
      rgbChangedCount +
      (configChanged ? 1 : 0) +
      (paletteChanged ? 1 : 0);

    return {
      baseDirty: baseChangedCount > 0,
      fn1Dirty: fn1ChangedCount > 0,
      rgbDirty: rgbChangedCount > 0,
      configDirty: configChanged,
      paletteDirty: paletteChanged,
      totalPending,
    };
  }, [draft, synced]);

  const missingFnKey = useMemo(() => {
    return !HI75C_KEYS.some(
      (k) => keyEntryToUint32(draft.baseKeymap[k.matrixIndex]) === KEY_ENTRY_FN
    );
  }, [draft.baseKeymap]);

  const setKeyEntry = useCallback((layer: 0 | 1, matrixIndex: number, code4B: number) => {
    const entry = uint32ToKeyEntry(code4B);
    setDraft((prev) => {
      const next = cloneSnapshot(prev);
      if (layer === 0) {
        next.baseKeymap[matrixIndex] = entry;
      } else {
        next.fn1Keymap[matrixIndex] = entry;
      }
      return next;
    });
  }, []);

  const resetKeyToDefault = useCallback((layer: 0 | 1, keyId: string) => {
    const keyDef = HI75C_KEY_BY_ID.get(keyId);
    if (!keyDef) return;
    const code4B = layer === 0 ? keyDef.defaultBase4B : keyDef.defaultFn4B;
    setKeyEntry(layer, keyDef.matrixIndex, code4B);
  }, [setKeyEntry]);

  const setRgbColor = useCallback((matrixIndex: number, color: RgbColor) => {
    setDraft((prev) => {
      const next = cloneSnapshot(prev);
      next.rgbMap[matrixIndex] = { ...color };
      return next;
    });
  }, []);

  const fillAllRgb = useCallback((color: RgbColor) => {
    setDraft((prev) => {
      const next = cloneSnapshot(prev);
      for (const k of HI75C_KEYS) {
        next.rgbMap[k.matrixIndex] = { ...color };
      }
      return next;
    });
  }, []);

  const updateConfig = useCallback((patch: Partial<DeviceConfig>) => {
    setDraft((prev) => {
      const next = cloneSnapshot(prev);
      next.config = { ...next.config, ...patch };
      return next;
    });
  }, []);

  const updateSlot = useCallback((slotIndex: number, patch: Partial<EffectSlotConfig>) => {
    setDraft((prev) => {
      const next = cloneSnapshot(prev);
      if (next.config.slots[slotIndex]) {
        next.config.slots[slotIndex] = { ...next.config.slots[slotIndex], ...patch };
      }
      return next;
    });
  }, []);

  const updatePaletteColor = useCallback(
    (hwEffectId: number, colorIndex: number, color: RgbColor) => {
      setDraft((prev) => {
        const next = cloneSnapshot(prev);
        if (next.palette.effects[hwEffectId]?.[colorIndex]) {
          next.palette.effects[hwEffectId][colorIndex] = { ...color };
        }
        return next;
      });
    },
    []
  );

  const buildProfileObject = useCallback(
    (snap: KeyboardSnapshot): Hi75cProfile => {
      const base: Record<string, number> = {};
      const fn1: Record<string, number> = {};
      const perKeyRgb: Record<string, RgbTuple> = {};
      for (const k of HI75C_KEYS) {
        base[k.id] = keyEntryToUint32(snap.baseKeymap[k.matrixIndex]);
        fn1[k.id] = keyEntryToUint32(snap.fn1Keymap[k.matrixIndex]);
        const c = snap.rgbMap[k.matrixIndex];
        perKeyRgb[k.id] = [c.r, c.g, c.b];
      }

      const activeEffect =
        LIGHTING_EFFECTS.find((e) => e.hwEffectId === snap.config.effectId) ??
        LIGHTING_EFFECTS[0];
      const slotIdx =
        activeEffect.hwEffectId >= 1 && activeEffect.hwEffectId <= 24
          ? activeEffect.hwEffectId - 1
          : 0;
      const slot = snap.config.slots[slotIdx] ?? snap.config.slots[0];
      const colorVal = slot?.color ?? 0;
      const customColorRow = snap.palette.effects[snap.config.effectId];
      const customRgb =
        colorVal < 7 ? customColorRow?.[colorVal] : undefined;

      return {
        schemaVersion: PROFILE_SCHEMA_VERSION,
        device: PROFILE_DEVICE_NAME,
        exportedAt: new Date().toISOString(),
        keymap: { base, fn1 },
        lighting: {
          effectId: snap.config.effectId,
          brightness: slot?.brightness ?? 7,
          speed: slot?.speed ?? 2,
          colorIndex: colorVal,
          multicolor: colorVal === 7,
          customFlag: snap.config.customFlag,
          winLock: snap.config.winLock,
          sleepSeconds: snap.config.sleepSeconds,
          ...(customRgb ? { customColor: [customRgb.r, customRgb.g, customRgb.b] } : {}),
        },
        perKeyRgb,
      };
    },
    []
  );

  const saveBackupBeforeWrite = useCallback(() => {
    try {
      const backup = serializeProfile(buildProfileObject(synced));
      localStorage.setItem(BACKUP_STORAGE_KEY, backup);
    } catch {
      // Ignore storage quota errors
    }
  }, [buildProfileObject, synced]);

  const applyChanges = useCallback(async () => {
    const client = clientRef.current;
    if (!client || connectionState !== 'connected' || diff.totalPending === 0 || busyRef.current) {
      return;
    }
    if (!hasSyncedDeviceRef.current) {
      setErrorMessage(t.status.asleep);
      return;
    }

    setIsApplying(true);
    setErrorMessage(null);
    setStatusMessage(null);
    busyRef.current = true;

    try {
      saveBackupBeforeWrite();

      if (diff.paletteDirty) {
        await client.writePalette(draft.palette);
      }
      if (diff.configDirty) {
        await client.writeConfig(draft.config);
      }
      if (diff.rgbDirty) {
        await client.writeRgbMap(draft.rgbMap);
      }
      if (diff.baseDirty) {
        await client.writeKeymap(KEYMAP_LAYER.BASE, draft.baseKeymap);
      }
      if (diff.fn1Dirty) {
        await client.writeKeymap(KEYMAP_LAYER.FN1, draft.fn1Keymap);
      }

      const verified = cloneSnapshot(draft);
      const rejectedTargets: string[] = [];

      if (diff.rgbDirty) {
        const actualRgb = await client.readRgbMap();
        const matched = HI75C_KEYS.every((k) =>
          rgbEqual(actualRgb[k.matrixIndex], draft.rgbMap[k.matrixIndex])
        );
        if (!matched) {
          verified.rgbMap = actualRgb;
          rejectedTargets.push(t.lighting.perKeyRgb);
        }
      }

      if (diff.baseDirty) {
        const actualBase = await client.readKeymap(KEYMAP_LAYER.BASE);
        const matched = HI75C_KEYS.every((k) =>
          keyEntryEquals(actualBase[k.matrixIndex], draft.baseKeymap[k.matrixIndex])
        );
        if (!matched) {
          verified.baseKeymap = actualBase;
          rejectedTargets.push(t.keymap.baseLayer);
        }
      }

      if (diff.fn1Dirty) {
        const actualFn1 = await client.readKeymap(KEYMAP_LAYER.FN1);
        const matched = HI75C_KEYS.every((k) =>
          keyEntryEquals(actualFn1[k.matrixIndex], draft.fn1Keymap[k.matrixIndex])
        );
        if (!matched) {
          verified.fn1Keymap = actualFn1;
          rejectedTargets.push(t.keymap.fn1Layer);
        }
      }

      setSynced(verified);
      setIsAsleep(false);
      if (rejectedTargets.length > 0) {
        setErrorMessage(t.feedback.writeRejected24g(rejectedTargets.join(' / ')));
      } else {
        setStatusMessage(t.feedback.saved);
      }
    } catch (err) {
      if (err instanceof DeviceAsleepError) {
        setIsAsleep(true);
        setErrorMessage(t.status.asleep);
      } else {
        setErrorMessage(err instanceof Error ? err.message : t.feedback.writeError);
      }
    } finally {
      busyRef.current = false;
      setIsApplying(false);
    }
  }, [
    connectionState,
    diff,
    draft,
    saveBackupBeforeWrite,
    t.feedback,
    t.keymap.baseLayer,
    t.keymap.fn1Layer,
    t.lighting.perKeyRgb,
    t.status.asleep,
  ]);

  const revertChanges = useCallback(() => {
    setDraft(cloneSnapshot(synced));
    setStatusMessage(t.feedback.reverted);
    setErrorMessage(null);
  }, [synced, t.feedback.reverted]);

  const exportProfileJson = useCallback((): string => {
    const profile = buildProfileObject(draft);
    setStatusMessage(t.feedback.exported);
    return serializeProfile(profile);
  }, [buildProfileObject, draft, t.feedback.exported]);

  const importProfileJson = useCallback(
    (rawJson: string): boolean => {
      try {
        const parsed = parseProfile(rawJson);
        setDraft((prev) => {
          const next = cloneSnapshot(prev);
          for (const [keyId, code4B] of Object.entries(parsed.keymap.base)) {
            const k = HI75C_KEY_BY_ID.get(keyId);
            if (k) next.baseKeymap[k.matrixIndex] = uint32ToKeyEntry(code4B);
          }
          for (const [keyId, code4B] of Object.entries(parsed.keymap.fn1)) {
            const k = HI75C_KEY_BY_ID.get(keyId);
            if (k) next.fn1Keymap[k.matrixIndex] = uint32ToKeyEntry(code4B);
          }
          for (const [keyId, rgb] of Object.entries(parsed.perKeyRgb)) {
            const k = HI75C_KEY_BY_ID.get(keyId);
            if (k) next.rgbMap[k.matrixIndex] = { r: rgb[0], g: rgb[1], b: rgb[2] };
          }
          next.config.effectId = parsed.lighting.effectId;
          next.config.customFlag = parsed.lighting.customFlag;
          next.config.winLock = parsed.lighting.winLock;
          next.config.sleepSeconds = parsed.lighting.sleepSeconds;
          next.config.sleepStep = sleepSecondsToStep(parsed.lighting.sleepSeconds);

          const effDef = LIGHTING_EFFECTS.find((e) => e.hwEffectId === parsed.lighting.effectId);
          const slotIdx =
            effDef && effDef.hwEffectId >= 1 && effDef.hwEffectId <= 24
              ? effDef.hwEffectId - 1
              : 0;
          if (next.config.slots[slotIdx]) {
            next.config.slots[slotIdx] = {
              brightness: parsed.lighting.brightness,
              speed: parsed.lighting.speed,
              color: parsed.lighting.multicolor ? 7 : parsed.lighting.colorIndex,
            };
          }

          if (parsed.lighting.customColor && parsed.lighting.colorIndex < 7) {
            const [r, g, b] = parsed.lighting.customColor;
            if (next.palette.effects[parsed.lighting.effectId]?.[parsed.lighting.colorIndex]) {
              next.palette.effects[parsed.lighting.effectId][parsed.lighting.colorIndex] = {
                r,
                g,
                b,
              };
            }
          }
          return next;
        });
        setStatusMessage(t.feedback.imported);
        setErrorMessage(null);
        return true;
      } catch {
        setErrorMessage(t.feedback.importError);
        return false;
      }
    },
    [t.feedback.importError, t.feedback.imported]
  );

  return {
    webHidSupported,
    connectionState,
    isAsleep,
    battery,
    psd,
    errorMessage,
    statusMessage,
    isApplying,
    synced,
    draft,
    diff,
    missingFnKey,
    connect,
    refreshBattery,
    setKeyEntry,
    resetKeyToDefault,
    setRgbColor,
    fillAllRgb,
    updateConfig,
    updateSlot,
    updatePaletteColor,
    applyChanges,
    revertChanges,
    exportProfileJson,
    importProfileJson,
  };
}
