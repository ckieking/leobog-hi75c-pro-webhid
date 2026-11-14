import { useEffect, useRef, useState } from 'react';
import { HI75C_KEYS, formatKeycodeLabel, type KeyDef } from '../data/hi75cLayout';
import type { Locale, Messages } from '../i18n/messages';
import { keyEntryEquals, type KeyEntry, type RgbColor } from '../protocol/codecs';
import { keyEntryToUint32 } from '../hooks/useKeyboardDevice';
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

const UNIT_PX = 50;
const GAP_PX = 4;
const PLATE_W = 16.25 * UNIT_PX - GAP_PX;
const PLATE_H = 6.25 * UNIT_PX - GAP_PX;
const CHASSIS_PAD_X = 40;
const CHASSIS_PAD_Y = 46;
const CHASSIS_W = PLATE_W + CHASSIS_PAD_X;
const CHASSIS_H = PLATE_H + CHASSIS_PAD_Y;

const QUICK_RGB_SWATCHES: RgbColor[] = [
  { r: 255, g: 255, b: 255 },
  { r: 239, g: 68, b: 68 },
  { r: 245, g: 158, b: 11 },
  { r: 52, g: 211, b: 153 },
  { r: 56, g: 189, b: 248 },
  { r: 59, g: 130, b: 246 },
  { r: 168, g: 85, b: 247 },
  { r: 0, g: 0, b: 0 },
];

function rgbToHex(c: RgbColor): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`;
}

function hexToRgb(hex: string): RgbColor {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16) || 0,
    g: parseInt(clean.slice(2, 4), 16) || 0,
    b: parseInt(clean.slice(4, 6), 16) || 0,
  };
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
  const [isPainting, setIsPainting] = useState(false);
  const [scale, setScale] = useState(1);
  const stageWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stop = () => setIsPainting(false);
    window.addEventListener('pointerup', stop);
    return () => window.removeEventListener('pointerup', stop);
  }, []);

  useEffect(() => {
    const el = stageWrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const updateScale = () => {
      const availableW = el.clientWidth - 24;
      if (availableW <= 0) return;
      const next = Math.min(1.18, Math.max(0.55, availableW / CHASSIS_W));
      setScale(Number(next.toFixed(3)));
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleKeyPointerDown = (key: KeyDef) => {
    if (mode === 'rgb') {
      const currentColor = rgbMap[key.matrixIndex] ?? { r: 255, g: 255, b: 255 };
      if (rgbTool === 'eyedropper') {
        onPickColor(currentColor);
        onRgbToolChange('paint');
      } else {
        setIsPainting(true);
        onPaintKey(key.matrixIndex);
      }
    } else {
      onSelectKey(key);
    }
  };

  const handleKeyPointerEnter = (key: KeyDef) => {
    if (mode === 'rgb' && isPainting && rgbTool === 'paint') {
      onPaintKey(key.matrixIndex);
    }
  };

  const selectedKey = selectedKeyId
    ? HI75C_KEYS.find((k) => k.id === selectedKeyId) ?? null
    : null;

  return (
    <div className="stage-card">
      <div className="stage-floating-bar">
        {mode === 'rgb' ? (
          <div className="stage-toolbar">
            <div className="toolbar-group">
              <span className="stage-mode-label">{t.lighting.perKeyRgb}</span>
              <input
                type="color"
                className="rgb-picker-inline"
                value={rgbToHex(paintColor)}
                onChange={(e) => onPaintColorChange(hexToRgb(e.target.value))}
                aria-label={t.lighting.customColor}
              />
              <span className="chip-mono tabular-nums">{rgbToHex(paintColor).toUpperCase()}</span>
              <div className="quick-swatches">
                {QUICK_RGB_SWATCHES.map((swatch) => {
                  const hex = rgbToHex(swatch);
                  const active =
                    swatch.r === paintColor.r &&
                    swatch.g === paintColor.g &&
                    swatch.b === paintColor.b;
                  return (
                    <button
                      key={hex}
                      type="button"
                      className={`quick-swatch ${active ? 'active' : ''}`}
                      style={{ background: hex }}
                      onClick={() => onPaintColorChange(swatch)}
                      title={hex.toUpperCase()}
                      aria-label={hex.toUpperCase()}
                    />
                  );
                })}
              </div>
            </div>

            <div className="toolbar-group">
              <button
                type="button"
                className={`btn ${rgbTool === 'paint' ? 'btn-primary' : ''}`}
                onClick={() => onRgbToolChange('paint')}
              >
                <IconBrush />
                <span>{t.actions.paint}</span>
              </button>
              <button
                type="button"
                className={`btn ${rgbTool === 'eyedropper' ? 'btn-primary' : ''}`}
                onClick={() => onRgbToolChange('eyedropper')}
              >
                <IconEyedropper />
                <span>{t.actions.eyedropper}</span>
              </button>
              <button type="button" className="btn" onClick={onFillAll}>
                <IconFill />
                <span>{t.actions.fillAll}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="stage-toolbar">
            <div className="toolbar-group">
              <div className="segmented-tabs compact">
                <button
                  type="button"
                  className={`tab-btn ${activeLayer === 0 ? 'active' : ''}`}
                  onClick={() => onLayerChange(0)}
                >
                  {t.keymap.baseLayer}
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeLayer === 1 ? 'active' : ''}`}
                  onClick={() => onLayerChange(1)}
                >
                  {t.keymap.fn1Layer}
                </button>
              </div>
            </div>

            {selectedKey && (
              <div className="toolbar-group">
                <span className="chip-mono tabular-nums">
                  {selectedKey.id} · #{selectedKey.matrixIndex}
                </span>
                <span className="selected-key-pill">{selectedKey.defaultLabel}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="keyboard-stage-wrap" ref={stageWrapRef}>
        <div
          className="keyboard-scale-box"
          style={{
            width: CHASSIS_W * scale,
            height: CHASSIS_H * scale,
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
            <span className="chassis-screw tl" aria-hidden="true" />
            <span className="chassis-screw tr" aria-hidden="true" />
            <span className="chassis-screw bl" aria-hidden="true" />
            <span className="chassis-screw br" aria-hidden="true" />

            <div className="keyboard-plate" style={{ width: PLATE_W, height: PLATE_H }}>
              {HI75C_KEYS.map((key) => {
                const left = key.x * UNIT_PX;
                const top = key.y * UNIT_PX;
                const width = key.w * UNIT_PX - GAP_PX;
                const height = key.h * UNIT_PX - GAP_PX;
                const isKnob = key.category === 'knob';
                const isSelected = mode === 'keymap' && selectedKeyId === key.id;

                const draftEntry = draftKeymap[key.matrixIndex];
                const syncedEntry = syncedKeymap[key.matrixIndex];
                const isModified =
                  mode === 'keymap' &&
                  draftEntry &&
                  syncedEntry &&
                  !keyEntryEquals(draftEntry, syncedEntry);

                const code4B = draftEntry ? keyEntryToUint32(draftEntry) : key.defaultBase4B;
                const shortLegend = formatKeycodeLabel(code4B, locale, true);

                const rgb = rgbMap[key.matrixIndex] ?? { r: 0, g: 0, b: 0 };
                const rgbCss = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
                const hasLight = rgb.r + rgb.g + rgb.b > 12;

                return (
                  <button
                    key={key.id}
                    type="button"
                    onPointerDown={() => handleKeyPointerDown(key)}
                    onPointerEnter={() => handleKeyPointerEnter(key)}
                    className={`keycap ${isKnob ? 'keycap-knob' : ''} ${isSelected ? 'selected' : ''} ${isModified ? 'modified' : ''} ${mode === 'rgb' ? 'rgb-mode' : ''}`}
                    style={{
                      left,
                      top,
                      width,
                      height,
                      ...(mode === 'rgb'
                        ? {
                            borderColor: hasLight
                              ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`
                              : 'rgba(255, 255, 255, 0.08)',
                            boxShadow: hasLight
                              ? `0 3px 0 #07080c, 0 0 14px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.32), inset 0 0 8px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`
                              : '0 3px 0 #07080c',
                          }
                        : {}),
                    }}
                  >
                    <span className="keycap-legend">{shortLegend}</span>
                    {!isKnob && <span className="keycap-sub">{key.defaultLabel}</span>}
                    {mode === 'rgb' && (
                      <span className="keycap-rgb-dot" style={{ background: rgbCss }} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="chassis-engraving" aria-hidden="true">
              LEOBOG · HI75C PRO
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
