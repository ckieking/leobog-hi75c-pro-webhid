import { useEffect, useRef, useState } from 'react';
import { HI75C_KEYS, formatKeycodeLabel, type KeyDef } from '../data/hi75cLayout';
import { keyEntryToUint32 } from '../hooks/useKeyboardDevice';
import type { Locale, Messages } from '../i18n/messages';
import type { KeyEntry, RgbColor } from '../protocol/codecs';
import { IconBrush, IconEyedropper, IconFill } from './Icons';

export type RgbTool = 'paint' | 'eyedropper';

interface KeyboardVisualProps {
  t: Messages;
  locale: Locale;
  mode: 'keymap' | 'rgb';
  activeLayer: 0 | 1;
  onLayerChange: (layer: 0 | 1) => void;
  selectedKeyId: string | null;
  onSelectKey: (key: KeyDef) => void;
  draftKeymap: KeyEntry[];
  syncedKeymap: KeyEntry[];
  rgbMap: RgbColor[];
  paintColor: RgbColor;
  rgbTool: RgbTool;
  onRgbToolChange: (tool: RgbTool) => void;
  onPaintKey: (matrixIndex: number) => void;
  onPickColor: (color: RgbColor) => void;
  onFillAll: () => void;
  onPaintColorChange: (color: RgbColor) => void;
}

const UNIT_X = 52;
const UNIT_Y = 52;
const KEY_GAP = 4;
const CHASSIS_PAD_X = 20;
const CHASSIS_PAD_Y = 20;
const KEYS_W = 16.25 * UNIT_X;
const KEYS_H = 6.5 * UNIT_Y;
const CHASSIS_W = KEYS_W + CHASSIS_PAD_X * 2;
const CHASSIS_H = KEYS_H + CHASSIS_PAD_Y * 2;

const QUICK_RGB_SWATCHES: Array<{ hex: string; color: RgbColor }> = [
  { hex: '#ff2b2b', color: { r: 255, g: 43, b: 43 } },
  { hex: '#ff8c1a', color: { r: 255, g: 140, b: 26 } },
  { hex: '#ffe11a', color: { r: 255, g: 225, b: 26 } },
  { hex: '#c6f24e', color: { r: 198, g: 242, b: 78 } },
  { hex: '#38bdf8', color: { r: 56, g: 189, b: 248 } },
  { hex: '#4a8ad6', color: { r: 74, g: 138, b: 214 } },
  { hex: '#e06c9f', color: { r: 224, g: 108, b: 159 } },
  { hex: '#ffffff', color: { r: 255, g: 255, b: 255 } },
  { hex: '#000000', color: { r: 0, g: 0, b: 0 } },
];

function rgbToHex({ r, g, b }: RgbColor): string {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function hexToRgb(hex: string): RgbColor {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return { r: 255, g: 255, b: 255 };
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

const COMPACT_LEGEND_MAP: Record<string, string> = {
  Delete: 'Del',
  'Page Up': 'PgUp',
  'Page Down': 'PgDn',
  Backspace: 'Bksp',
  'Caps Lock': 'Caps',
  'Left Shift': 'Shift',
  'Right Shift': 'RShift',
  'Left Ctrl': 'Ctrl',
  'Right Ctrl': 'RCtrl',
  'Left Win': 'Win',
  'Right Win': 'Win',
  'Left Alt': 'Alt',
  'Right Alt': 'RAlt',
  'FN (Layer 1)': 'Fn1',
  Knob: 'VOL',
  'Knob Volume': 'VOL',
  'Knob Volume / Mute': 'VOL',
  'Play / Pause': 'Play',
  'Volume Up': 'Vol+',
  'Volume Down': 'Vol-',
  'Print Screen': 'PrtSc',
  'Scroll Lock': 'ScrLk',
  Insert: 'Ins',
  Up: '↑',
  Down: '↓',
  Left: '←',
  Right: '→',
  'Right Menu': 'Menu',
};

function compactKeycapLegend(
  raw: string,
  key: KeyDef,
  code4B: number,
  activeLayer: 0 | 1,
  locale: Locale
): string {
  const source = activeLayer === 0 && code4B === key.defaultBase4B ? raw || key.defaultLabel : raw;
  if (key.category === 'knob' && source.toLowerCase().includes('knob')) {
    return locale === 'zh-TW' ? '音量' : 'VOL';
  }
  return COMPACT_LEGEND_MAP[source] ?? source;
}

function isAccentModifierKey(key: KeyDef): boolean {
  if (key.category === 'knob') return false;
  return key.category === 'modifier' || key.id === 'K01';
}

export function KeyboardVisual({
  t,
  locale,
  mode,
  activeLayer,
  onLayerChange,
  selectedKeyId,
  onSelectKey,
  draftKeymap,
  syncedKeymap,
  rgbMap,
  paintColor,
  rgbTool,
  onRgbToolChange,
  onPaintKey,
  onPickColor,
  onFillAll,
  onPaintColorChange,
}: KeyboardVisualProps) {
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = stageWrapRef.current;
    if (!el) return;

    const updateScale = (width: number) => {
      const next = Math.min(1, Math.max(0.28, (width - 4) / CHASSIS_W));
      setScale(next);
    };

    updateScale(el.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        updateScale(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const paintHex = rgbToHex(paintColor);
  const selectedDef = HI75C_KEYS.find((k) => k.id === selectedKeyId) ?? null;
  const selectedEntry = selectedDef ? draftKeymap[selectedDef.matrixIndex] : undefined;
  const selectedCode4B = selectedEntry ? keyEntryToUint32(selectedEntry) : 0;
  const selectedLabel = selectedDef
    ? activeLayer === 1 && selectedCode4B === 0
      ? '—'
      : formatKeycodeLabel(selectedCode4B, locale, false)
    : null;

  return (
    <section className="stage-panel" aria-label={t.appName}>
      <div className="stage-toolbar">
        {mode === 'keymap' ? (
          <>
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

            {selectedDef && (
              <div className="stage-selection-chip">
                <span className="stage-selection-label">
                  {selectedDef.defaultLabel === selectedLabel
                    ? selectedLabel
                    : `${selectedDef.defaultLabel} → ${selectedLabel}`}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="rgb-stage-bar">
            <div className="rgb-tool-group">
              <button
                type="button"
                aria-pressed={rgbTool === 'paint'}
                className={`tool-btn ${rgbTool === 'paint' ? 'active' : ''}`}
                onClick={() => onRgbToolChange('paint')}
              >
                <IconBrush size={14} />
                <span>{t.actions.paint}</span>
              </button>
              <button
                type="button"
                aria-pressed={rgbTool === 'eyedropper'}
                className={`tool-btn ${rgbTool === 'eyedropper' ? 'active' : ''}`}
                onClick={() => onRgbToolChange('eyedropper')}
              >
                <IconEyedropper size={14} />
                <span>{t.actions.eyedropper}</span>
              </button>
            </div>

            <div className="rgb-swatches-bar">
              <label className="color-picker-well" title={t.lighting.customColor}>
                <input
                  type="color"
                  aria-label={t.lighting.customColor}
                  value={paintHex}
                  onChange={(e) => onPaintColorChange(hexToRgb(e.target.value))}
                />
                <code>{paintHex}</code>
              </label>

              {QUICK_RGB_SWATCHES.map((swatch) => {
                const active = paintHex === swatch.hex;
                return (
                  <button
                    key={swatch.hex}
                    type="button"
                    className={`rgb-quick-swatch ${active ? 'active' : ''}`}
                    style={{ backgroundColor: swatch.hex }}
                    aria-label={`${t.lighting.color} ${swatch.hex}`}
                    aria-pressed={active}
                    onClick={() => onPaintColorChange(swatch.color)}
                  />
                );
              })}

              <button type="button" className="tool-btn" onClick={onFillAll}>
                <IconFill size={14} />
                <span>{t.actions.fillAll}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="keyboard-stage-wrap" ref={stageWrapRef}>
        <div
          className="keyboard-scale-box"
          style={{
            width: Math.round(CHASSIS_W * scale),
            height: Math.round(CHASSIS_H * scale),
          }}
        >
          <div
            className="keyboard-chassis"
            style={{
              width: CHASSIS_W,
              height: CHASSIS_H,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            <div
              className="keys-layer"
              style={{
                left: CHASSIS_PAD_X,
                top: CHASSIS_PAD_Y,
                width: KEYS_W,
                height: KEYS_H,
              }}
            >
              {HI75C_KEYS.map((key) => {
                const left = key.x * UNIT_X + KEY_GAP / 2;
                const top = key.y * UNIT_Y + KEY_GAP / 2;
                const w = key.w * UNIT_X - KEY_GAP;
                const h = key.h * UNIT_Y - KEY_GAP;

                const entry = draftKeymap[key.matrixIndex];
                const syncedEntry = syncedKeymap[key.matrixIndex];
                const code4B = entry ? keyEntryToUint32(entry) : 0;
                const syncedCode4B = syncedEntry ? keyEntryToUint32(syncedEntry) : 0;
                const isDirty = mode === 'keymap' && code4B !== syncedCode4B;
                const isSelected = mode === 'keymap' && selectedKeyId === key.id;
                const isTransparent = activeLayer === 1 && code4B === 0;
                const rawLegend = formatKeycodeLabel(code4B, locale, true) || key.defaultLabel;
                const legendText = isTransparent
                  ? '—'
                  : compactKeycapLegend(rawLegend, key, code4B, activeLayer, locale);

                const rgb = rgbMap[key.matrixIndex] ?? { r: 255, g: 255, b: 255 };
                const isLit = rgb.r + rgb.g + rgb.b > 18;
                const rgbColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

                const isKnob = key.category === 'knob';

                const keyClassNames = [
                  'keycap',
                  isKnob ? 'keycap-knob' : '',
                  isAccentModifierKey(key) ? 'keycap-mod' : '',
                  isSelected ? 'selected' : '',
                  isTransparent ? 'transparent-key' : '',
                  mode === 'rgb' ? 'rgb-mode' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <button
                    key={key.id}
                    type="button"
                    className={keyClassNames}
                    style={{
                      left,
                      top,
                      width: w,
                      height: h,
                      borderColor: mode === 'rgb' && isLit ? rgbColor : undefined,
                    }}
                    aria-pressed={isSelected}
                    aria-label={`${key.defaultLabel} (${legendText})`}
                    title={
                      key.defaultLabel === legendText
                        ? legendText
                        : `${key.defaultLabel} → ${legendText}`
                    }
                    onClick={() => {
                      if (mode === 'rgb') {
                        if (rgbTool === 'eyedropper') {
                          onPickColor(rgb);
                        } else {
                          onPaintKey(key.matrixIndex);
                        }
                      } else {
                        onSelectKey(key);
                      }
                    }}
                  >
                    {isKnob ? (
                      <div className="knob-assembly">
                        <span className="knob-legend">{legendText}</span>
                      </div>
                    ) : (
                      <div
                        className="keycap-dish"
                        style={
                          mode === 'rgb' && isLit
                            ? { backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22)` }
                            : undefined
                        }
                      >
                        <span className="keycap-legend">{legendText}</span>
                        {isDirty && <span className="keycap-dirty-dot" aria-hidden="true" />}
                        {mode === 'rgb' && (
                          <span
                            className="keycap-rgb-dot"
                            style={{ backgroundColor: isLit ? rgbColor : '#141414' }}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
