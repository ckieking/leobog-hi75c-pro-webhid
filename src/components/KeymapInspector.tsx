import { useEffect, useMemo, useState } from 'react';
import {
  KEYCODE_CATALOG,
  MODIFIER_BITS,
  encodeStdKey4B,
  formatKeycodeLabel,
  type KeyDef,
  type KeycodeGroup,
} from '../data/hi75cLayout';
import { keyEntryToUint32 } from '../hooks/useKeyboardDevice';
import type { Locale, Messages } from '../i18n/messages';
import type { KeyEntry } from '../protocol/codecs';
import { IconReset, IconSearch } from './Icons';

interface KeymapInspectorProps {
  t: Messages;
  locale: Locale;
  activeLayer: 0 | 1;
  onLayerChange: (layer: 0 | 1) => void;
  selectedKey: KeyDef | null;
  draftKeymap: KeyEntry[];
  onAssignCode: (layer: 0 | 1, matrixIndex: number, code4B: number) => void;
  onResetKey: (layer: 0 | 1, keyId: string) => void;
}

const EVENT_CODE_TO_HID: Record<string, number> = {
  KeyA: 0x04, KeyB: 0x05, KeyC: 0x06, KeyD: 0x07, KeyE: 0x08, KeyF: 0x09,
  KeyG: 0x0a, KeyH: 0x0b, KeyI: 0x0c, KeyJ: 0x0d, KeyK: 0x0e, KeyL: 0x0f,
  KeyM: 0x10, KeyN: 0x11, KeyO: 0x12, KeyP: 0x13, KeyQ: 0x14, KeyR: 0x15,
  KeyS: 0x16, KeyT: 0x17, KeyU: 0x18, KeyV: 0x19, KeyW: 0x1a, KeyX: 0x1b,
  KeyY: 0x1c, KeyZ: 0x1d,
  Digit1: 0x1e, Digit2: 0x1f, Digit3: 0x20, Digit4: 0x21, Digit5: 0x22,
  Digit6: 0x23, Digit7: 0x24, Digit8: 0x25, Digit9: 0x26, Digit0: 0x27,
  Enter: 0x28, Escape: 0x29, Backspace: 0x2a, Tab: 0x2b, Space: 0x2c,
  Minus: 0x2d, Equal: 0x2e, BracketLeft: 0x2f, BracketRight: 0x30,
  Backslash: 0x31, Semicolon: 0x33, Quote: 0x34, Backquote: 0x35,
  Comma: 0x36, Period: 0x37, Slash: 0x38, CapsLock: 0x39,
  F1: 0x3a, F2: 0x3b, F3: 0x3c, F4: 0x3d, F5: 0x3e, F6: 0x3f,
  F7: 0x40, F8: 0x41, F9: 0x42, F10: 0x43, F11: 0x44, F12: 0x45,
  PrintScreen: 0x46, ScrollLock: 0x47, Pause: 0x48, Insert: 0x49,
  Home: 0x4a, PageUp: 0x4b, Delete: 0x4c, End: 0x4d, PageDown: 0x4e,
  ArrowRight: 0x4f, ArrowLeft: 0x50, ArrowDown: 0x51, ArrowUp: 0x52,
  ContextMenu: 0x65,
  ControlLeft: 0xe0, ShiftLeft: 0xe1, AltLeft: 0xe2, MetaLeft: 0xe3,
  ControlRight: 0xe4, ShiftRight: 0xe5, AltRight: 0xe6, MetaRight: 0xe7,
};

export function KeymapInspector({
  t,
  locale,
  activeLayer,
  onLayerChange,
  selectedKey,
  draftKeymap,
  onAssignCode,
  onResetKey,
}: KeymapInspectorProps) {
  const [group, setGroup] = useState<KeycodeGroup>('standard');
  const [search, setSearch] = useState('');
  const [listening, setListening] = useState(false);

  const currentCode4B = useMemo(() => {
    if (!selectedKey) return 0;
    const entry = draftKeymap[selectedKey.matrixIndex];
    return entry ? keyEntryToUint32(entry) : 0;
  }, [draftKeymap, selectedKey]);

  const isStdKey = ((currentCode4B >>> 24) & 0xff) === 0x00 && (currentCode4B & 0xff) !== 0;
  const activeModMask = isStdKey ? (currentCode4B >>> 16) & 0xff : 0;
  const activeBaseHid = isStdKey ? currentCode4B & 0xff : 0;

  useEffect(() => {
    if (!listening || !selectedKey) return;
    let pendingModifierHid: number | null = null;
    let assigned = false;

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const hid = EVENT_CODE_TO_HID[e.code];
      if (!hid) {
        setListening(false);
        return;
      }
      if (hid >= 0xe0 && hid <= 0xe7) {
        pendingModifierHid = hid;
        return;
      }
      let mods = 0;
      if (e.ctrlKey) mods |= MODIFIER_BITS.LCTRL;
      if (e.shiftKey) mods |= MODIFIER_BITS.LSHIFT;
      if (e.altKey) mods |= MODIFIER_BITS.LALT;
      if (e.metaKey) mods |= MODIFIER_BITS.LWIN;
      assigned = true;
      onAssignCode(activeLayer, selectedKey.matrixIndex, encodeStdKey4B(hid, mods));
      setListening(false);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (assigned || pendingModifierHid === null) return;
      const hid = EVENT_CODE_TO_HID[e.code];
      if (hid === pendingModifierHid) {
        e.preventDefault();
        e.stopPropagation();
        assigned = true;
        onAssignCode(activeLayer, selectedKey.matrixIndex, encodeStdKey4B(hid, 0));
        setListening(false);
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
  }, [activeLayer, listening, onAssignCode, selectedKey]);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return KEYCODE_CATALOG.filter((item) => {
      if (!q && item.group !== group) return false;
      if (!q) return true;
      return (
        item.labelEn.toLowerCase().includes(q) ||
        item.labelZhTW.toLowerCase().includes(q) ||
        item.shortLabel.toLowerCase().includes(q)
      );
    });
  }, [group, search]);

  const toggleModBit = (bit: number) => {
    if (!selectedKey || !activeBaseHid || activeBaseHid >= 0xe0) return;
    const nextMod = activeModMask ^ bit;
    onAssignCode(activeLayer, selectedKey.matrixIndex, encodeStdKey4B(activeBaseHid, nextMod));
  };

  const handleCatalogPick = (entryCode4B: number, entryGroup: KeycodeGroup, hidUsage?: number) => {
    if (!selectedKey) return;
    if (entryGroup === 'standard' && hidUsage !== undefined) {
      onAssignCode(
        activeLayer,
        selectedKey.matrixIndex,
        encodeStdKey4B(hidUsage, activeModMask)
      );
    } else {
      onAssignCode(activeLayer, selectedKey.matrixIndex, entryCode4B);
    }
  };

  const groupLabels: { id: KeycodeGroup; label: string }[] = [
    { id: 'standard', label: t.keymap.groupStandard },
    { id: 'modifier', label: t.keymap.groupModifier },
    { id: 'consumer', label: t.keymap.groupConsumer },
    { id: 'firmware', label: t.keymap.groupFirmware },
    { id: 'special', label: t.keymap.groupSpecial },
  ];

  return (
    <aside className="inspector-card" aria-label={t.tabs.keymap}>
      <div className="panel-header">
        <div className="segmented-control" role="tablist" aria-label={t.telemetry.layerLabel}>
          <button
            type="button"
            role="tab"
            aria-selected={activeLayer === 0}
            className={`segmented-btn ${activeLayer === 0 ? 'active' : ''}`}
            onClick={() => onLayerChange(0)}
          >
            {t.keymap.baseLayer}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeLayer === 1}
            className={`segmented-btn ${activeLayer === 1 ? 'active' : ''}`}
            onClick={() => onLayerChange(1)}
          >
            {t.keymap.fn1Layer}
          </button>
        </div>
      </div>

      {!selectedKey ? (
        <div className="empty-state">{t.keymap.noKeySelected}</div>
      ) : (
        <>
          <div className="inspector-section">
            <div className="control-row">
              <h2 className="panel-heading">{selectedKey.defaultLabel}</h2>
            </div>

            <div className="mapping-readout-grid">
              <div className="mapping-readout-cell">
                <span className="field-label">{t.keymap.currentMapping}</span>
                <kbd className="mapping-value">
                  {formatKeycodeLabel(currentCode4B, locale, false)}
                </kbd>
              </div>
              <div className="mapping-readout-cell">
                <span className="field-label">{t.keymap.defaultMapping}</span>
                <kbd className="mapping-value muted">
                  {formatKeycodeLabel(
                    activeLayer === 0 ? selectedKey.defaultBase4B : selectedKey.defaultFn4B,
                    locale,
                    false
                  )}
                </kbd>
              </div>
            </div>

            <div className="inspector-action-row">
              <button
                type="button"
                className={`btn-action ${listening ? 'listening' : ''}`}
                aria-pressed={listening}
                onClick={() => setListening((v) => !v)}
              >
                {listening ? t.actions.listening : t.actions.listenKey}
              </button>
              <button
                type="button"
                className="btn-action"
                onClick={() => onResetKey(activeLayer, selectedKey.id)}
              >
                <IconReset size={14} />
                <span>{t.actions.resetKey}</span>
              </button>
            </div>
          </div>

          <div className="inspector-section">
            <span className="field-label">{t.keymap.modifiers}</span>
            <div className="mod-grid">
              {[
                { label: 'Ctrl', bit: MODIFIER_BITS.LCTRL },
                { label: 'Shift', bit: MODIFIER_BITS.LSHIFT },
                { label: 'Alt', bit: MODIFIER_BITS.LALT },
                { label: 'Win', bit: MODIFIER_BITS.LWIN },
              ].map((m) => {
                const modActive = (activeModMask & m.bit) !== 0;
                return (
                  <button
                    key={m.label}
                    type="button"
                    disabled={!activeBaseHid || activeBaseHid >= 0xe0}
                    aria-pressed={modActive}
                    className={`mod-btn ${modActive ? 'active' : ''}`}
                    onClick={() => toggleModBit(m.bit)}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="inspector-section">
            <div className="search-field-wrap">
              <IconSearch size={14} className="search-icon" />
              <input
                type="search"
                className="search-input"
                aria-label={t.keymap.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.keymap.searchPlaceholder}
              />
            </div>

            {!search.trim() && (
              <div className="filter-pills">
                {groupLabels.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    aria-pressed={group === g.id}
                    className={`filter-pill ${group === g.id ? 'active' : ''}`}
                    onClick={() => setGroup(g.id)}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            )}

            <div className="keycode-list">
              {filteredCatalog.map((item) => {
                const active = (item.code4B >>> 0) === (currentCode4B >>> 0);
                const label = locale === 'zh-TW' ? item.labelZhTW : item.labelEn;
                return (
                  <button
                    key={`${item.group}-${item.code4B}`}
                    type="button"
                    aria-pressed={active}
                    className={`keycode-btn ${active ? 'active' : ''}`}
                    onClick={() => handleCatalogPick(item.code4B, item.group, item.hidUsage)}
                    title={label}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
