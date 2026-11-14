import {
  LIGHTING_EFFECTS,
  RGB_COLOR_PRESETS,
  SLEEP_TIMER_OPTIONS,
} from '../data/hi75cLayout';
import type { Locale, Messages } from '../i18n/messages';
import type {
  DeviceConfig,
  EffectSlotConfig,
  PaletteData,
  RgbColor,
} from '../protocol/codecs';
import { IconMulticolorRing } from './Icons';

interface LightingPanelProps {
  t: Messages;
  locale: Locale;
  config: DeviceConfig;
  palette: PaletteData;
  onUpdateConfig: (patch: Partial<DeviceConfig>) => void;
  onUpdateSlot: (slotIndex: number, patch: Partial<EffectSlotConfig>) => void;
  onUpdatePaletteColor: (hwEffectId: number, colorIndex: number, color: RgbColor) => void;
}

function rgbToHex({ r, g, b }: RgbColor): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${((1 << 24) | (clamp(r) << 16) | (clamp(g) << 8) | clamp(b)).toString(16).slice(1)}`;
}

function hexToRgb(hex: string): RgbColor {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16) || 0,
    g: parseInt(clean.slice(2, 4), 16) || 0,
    b: parseInt(clean.slice(4, 6), 16) || 0,
  };
}

export function LightingPanel({
  t,
  locale,
  config,
  palette,
  onUpdateConfig,
  onUpdateSlot,
  onUpdatePaletteColor,
}: LightingPanelProps) {
  const activeEffect =
    LIGHTING_EFFECTS.find((e) => e.hwEffectId === config.effectId) ?? LIGHTING_EFFECTS[0];
  const slotIndex =
    activeEffect.hwEffectId >= 1 && activeEffect.hwEffectId <= 24 ? activeEffect.hwEffectId - 1 : 0;
  const slot = config.slots[slotIndex] ?? { brightness: 7, speed: 2, color: 7 };

  const selectedColorIndex = slot.color < 7 ? slot.color : 0;
  const paletteRgb = palette.effects[activeEffect.hwEffectId]?.[selectedColorIndex] ?? {
    r: 56,
    g: 189,
    b: 248,
  };

  return (
    <aside className="inspector-card" aria-label={t.tabs.lighting}>
      <div className="panel-header">
        <h2 className="panel-heading">{t.lighting.effectsTitle}</h2>
        <code className="code-badge">
          {config.customFlag
            ? t.lighting.perKeyModeOn
            : locale === 'zh-TW'
              ? activeEffect.nameZhTW
              : activeEffect.nameEn}
        </code>
      </div>

      <div className="switch-row">
        <span className="switch-label">{t.lighting.perKeyRgb}</span>
        <button
          type="button"
          role="switch"
          aria-checked={config.customFlag}
          aria-label={t.lighting.perKeyRgb}
          className={`toggle-pill ${config.customFlag ? 'on' : ''}`}
          onClick={() => {
            const nextCustom = !config.customFlag;
            onUpdateConfig({
              customFlag: nextCustom,
              effectId: nextCustom ? 32 : config.effectId === 32 ? 1 : config.effectId,
            });
          }}
        />
      </div>

      <div className="inspector-section">
        <div className="effects-grid">
          {LIGHTING_EFFECTS.map((eff) => {
            const isActive =
              eff.hwEffectId === 32
                ? config.customFlag
                : !config.customFlag && config.effectId === eff.hwEffectId;
            return (
              <button
                key={eff.id}
                type="button"
                aria-pressed={isActive}
                className={`effect-card ${isActive ? 'active' : ''}`}
                onClick={() =>
                  onUpdateConfig({
                    customFlag: eff.hwEffectId === 32,
                    effectId: eff.hwEffectId,
                  })
                }
              >
                <span className="effect-name">
                  {locale === 'zh-TW' ? eff.nameZhTW : eff.nameEn}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeEffect.supportsBrightness && (
        <div className="inspector-section">
          <div className="control-row">
            <span className="field-label">{t.lighting.brightness}</span>
            <code className="code-badge">{slot.brightness} / 9</code>
          </div>
          <input
            type="range"
            min={0}
            max={9}
            step={1}
            aria-label={t.lighting.brightness}
            className="range-slider"
            value={slot.brightness}
            onChange={(e) => onUpdateSlot(slotIndex, { brightness: Number(e.target.value) })}
          />
        </div>
      )}

      {activeEffect.supportsSpeed && (
        <div className="inspector-section">
          <div className="control-row">
            <span className="field-label">{t.lighting.speed}</span>
            <code className="code-badge">{slot.speed} / 4</code>
          </div>
          <input
            type="range"
            min={0}
            max={4}
            step={1}
            aria-label={t.lighting.speed}
            className="range-slider"
            value={slot.speed}
            onChange={(e) => onUpdateSlot(slotIndex, { speed: Number(e.target.value) })}
          />
        </div>
      )}

      {activeEffect.supportsColor && (
        <div className="inspector-section">
          <div className="control-row">
            <span className="field-label">{t.lighting.color}</span>
            {slot.color < 7 && (
              <label className="color-picker-well" title={t.lighting.customColor}>
                <input
                  type="color"
                  aria-label={t.lighting.customColor}
                  value={rgbToHex(paletteRgb)}
                  onChange={(e) =>
                    onUpdatePaletteColor(
                      activeEffect.hwEffectId,
                      selectedColorIndex,
                      hexToRgb(e.target.value)
                    )
                  }
                />
                <code>{rgbToHex(paletteRgb)}</code>
              </label>
            )}
          </div>
          <div className="swatch-row">
            {RGB_COLOR_PRESETS.map((preset) => {
              const pColor = palette.effects[activeEffect.hwEffectId]?.[preset.index];
              const bg = pColor ? rgbToHex(pColor) : preset.hex;
              const active = slot.color === preset.index;
              const label = locale === 'zh-TW' ? preset.nameZhTW : preset.nameEn;
              return (
                <button
                  key={preset.index}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={active}
                  className={`swatch-btn ${active ? 'active' : ''}`}
                  style={{ backgroundColor: bg }}
                  onClick={() => onUpdateSlot(slotIndex, { color: preset.index })}
                />
              );
            })}
            {activeEffect.supportsMulticolor && (
              <button
                type="button"
                title={t.lighting.multicolor}
                aria-label={t.lighting.multicolor}
                aria-pressed={slot.color === 7}
                className={`swatch-btn swatch-multicolor ${slot.color === 7 ? 'active' : ''}`}
                onClick={() => onUpdateSlot(slotIndex, { color: 7 })}
              >
                <IconMulticolorRing size={22} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="switch-row">
        <span className="switch-label">{t.lighting.winLock}</span>
        <button
          type="button"
          role="switch"
          aria-checked={config.winLock}
          aria-label={t.lighting.winLock}
          className={`toggle-pill ${config.winLock ? 'on' : ''}`}
          onClick={() => onUpdateConfig({ winLock: !config.winLock })}
        />
      </div>

      <div className="control-row">
        <span className="field-label">{t.lighting.sleepTimer}</span>
        <select
          className="select-field"
          aria-label={t.lighting.sleepTimer}
          value={config.sleepSeconds}
          onChange={(e) => {
            const seconds = Number(e.target.value);
            const opt = SLEEP_TIMER_OPTIONS.find((o) => o.seconds === seconds);
            onUpdateConfig({
              sleepSeconds: seconds,
              sleepStep: opt?.step ?? 0,
            });
          }}
        >
          {SLEEP_TIMER_OPTIONS.map((opt) => (
            <option key={opt.seconds} value={opt.seconds}>
              {locale === 'zh-TW' ? opt.labelZhTW : opt.labelEn}
            </option>
          ))}
        </select>
      </div>
    </aside>
  );
}
