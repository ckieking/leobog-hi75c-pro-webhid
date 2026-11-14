import { useState } from 'react';
import { IconRail, TopBar, type ActiveTab } from './components/HeaderBar';
import { IconAlert, IconCheck } from './components/Icons';
import { KeyboardVisual, type RgbTool } from './components/KeyboardVisual';
import { KeymapInspector } from './components/KeymapInspector';
import { LightingPanel } from './components/LightingPanel';
import {
  HI75C_KEYS,
  HI75C_KEY_BY_ID,
  LIGHTING_EFFECTS,
  formatKeycodeLabel,
} from './data/hi75cLayout';
import { keyEntryToUint32, useKeyboardDevice } from './hooks/useKeyboardDevice';
import { useLocale } from './i18n/useLocale';
import type { RgbColor } from './protocol/codecs';

export function App() {
  const { locale, toggleLocale, t } = useLocale();
  const device = useKeyboardDevice(t);

  const [activeTab, setActiveTab] = useState<ActiveTab>('keymap');
  const [activeLayer, setActiveLayer] = useState<0 | 1>(0);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(HI75C_KEYS[0]?.id ?? null);
  const [paintColor, setPaintColor] = useState<RgbColor>({ r: 56, g: 189, b: 248 });
  const [rgbTool, setRgbTool] = useState<RgbTool>('paint');
  const [inspectorOpen, setInspectorOpen] = useState(true);

  const selectedKey = selectedKeyId ? (HI75C_KEY_BY_ID.get(selectedKeyId) ?? null) : null;

  const draftKeymap = activeLayer === 0 ? device.draft.baseKeymap : device.draft.fn1Keymap;
  const syncedKeymap = activeLayer === 0 ? device.synced.baseKeymap : device.synced.fn1Keymap;

  const visualMode = activeTab === 'lighting' && device.draft.config.customFlag ? 'rgb' : 'keymap';

  const knobDef = HI75C_KEY_BY_ID.get('K82');
  const knobEntry = knobDef ? draftKeymap[knobDef.matrixIndex] : undefined;
  const knobCode4B = knobEntry ? keyEntryToUint32(knobEntry) : 0;
  const knobLabel =
    activeLayer === 1 && knobCode4B === 0 ? '—' : formatKeycodeLabel(knobCode4B, locale, false);

  const activeEffect =
    LIGHTING_EFFECTS.find((e) => e.hwEffectId === device.draft.config.effectId) ??
    LIGHTING_EFFECTS[0];

  const lightingSummary = device.draft.config.customFlag
    ? t.telemetry.perKeyRgbActive
    : activeEffect.hwEffectId === 0
      ? t.telemetry.offState
      : locale === 'zh-TW'
        ? activeEffect.nameZhTW
        : activeEffect.nameEn;

  const handleSelectKnob = () => {
    setActiveTab('keymap');
    setSelectedKeyId('K82');
    setInspectorOpen(true);
  };

  const handleExportProfile = () => {
    const json = device.exportProfileJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leobog-hi75c-profile.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasAlerts = !device.webHidSupported || Boolean(device.errorMessage) || device.missingFnKey;

  return (
    <div className="app-shell">
      <IconRail
        t={t}
        locale={locale}
        activeTab={activeTab}
        selectedKeyId={selectedKeyId}
        inspectorOpen={inspectorOpen}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setInspectorOpen(true);
        }}
        onSelectKnob={handleSelectKnob}
        onToggleInspector={() => setInspectorOpen((open) => !open)}
        onToggleLocale={toggleLocale}
        onExportProfile={handleExportProfile}
        onImportProfile={(raw) => {
          device.importProfileJson(raw);
        }}
      />

      <div className="workspace-column">
        <TopBar
          t={t}
          connectionState={device.connectionState}
          isAsleep={device.isAsleep}
          battery={device.battery}
          webHidSupported={device.webHidSupported}
          onConnect={() => void device.connect()}
          onRefreshBattery={() => void device.refreshBattery()}
        />

        {hasAlerts && (
          <div className="alerts-stack">
            {!device.webHidSupported && (
              <div className="alert-banner error" role="alert">
                <IconAlert size={15} />
                <span>{t.status.unsupportedWebHid}</span>
              </div>
            )}

            {device.errorMessage && (
              <div className="alert-banner error" role="alert">
                <IconAlert size={15} />
                <span>{device.errorMessage}</span>
              </div>
            )}

            {device.missingFnKey && (
              <div className="alert-banner warning" role="status">
                <IconAlert size={15} />
                <span>{t.keymap.missingFnWarning}</span>
              </div>
            )}
          </div>
        )}

        <section className="telemetry-strip" aria-label={t.telemetry.syncLabel}>
          <button
            type="button"
            className="telemetry-cell telemetry-clickable"
            onClick={() => {
              setActiveLayer((l) => (l === 0 ? 1 : 0));
              setActiveTab('keymap');
            }}
          >
            <span className="field-label">{t.telemetry.layerLabel}</span>
            <span className="telemetry-value">
              {activeLayer === 0 ? t.keymap.baseLayer : t.keymap.fn1Layer}
            </span>
          </button>

          <button
            type="button"
            className="telemetry-cell telemetry-clickable"
            onClick={handleSelectKnob}
          >
            <span className="field-label">{t.telemetry.encoderLabel}</span>
            <span className="telemetry-value">{knobLabel}</span>
          </button>

          <button
            type="button"
            className="telemetry-cell telemetry-clickable"
            onClick={() => {
              setActiveTab('lighting');
              setInspectorOpen(true);
            }}
          >
            <span className="field-label">{t.telemetry.lightingLabel}</span>
            <span className="telemetry-value">{lightingSummary}</span>
          </button>

          <div className="telemetry-cell telemetry-sync-cell">
            <div className="telemetry-sync-meta">
              <span className="field-label">{t.telemetry.syncLabel}</span>
              {device.diff.totalPending > 0 ? (
                <span className="telemetry-value sync-pending">
                  {t.feedback.pendingChanges(device.diff.totalPending)}
                </span>
              ) : (
                <span className="telemetry-value sync-ok">
                  <IconCheck size={14} />
                  {t.telemetry.synced}
                </span>
              )}
            </div>

            {device.diff.totalPending > 0 && (
              <div className="telemetry-sync-actions">
                <button
                  type="button"
                  className="btn-secondary-pill compact"
                  onClick={device.revertChanges}
                >
                  {t.actions.revert}
                </button>
                <button
                  type="button"
                  className="btn-primary-pill compact"
                  disabled={device.connectionState !== 'connected' || device.isApplying}
                  onClick={() => void device.applyChanges()}
                >
                  {t.actions.apply}
                </button>
              </div>
            )}
          </div>
        </section>

        <main className={`workspace-main ${inspectorOpen ? '' : 'inspector-collapsed'}`}>
          <KeyboardVisual
            t={t}
            locale={locale}
            mode={visualMode}
            activeLayer={activeLayer}
            onLayerChange={setActiveLayer}
            selectedKeyId={selectedKeyId}
            onSelectKey={(k) => {
              setSelectedKeyId(k.id);
              setInspectorOpen(true);
              if (activeTab !== 'keymap') setActiveTab('keymap');
            }}
            draftKeymap={draftKeymap}
            syncedKeymap={syncedKeymap}
            rgbMap={device.draft.rgbMap}
            paintColor={paintColor}
            rgbTool={rgbTool}
            onRgbToolChange={setRgbTool}
            onPaintKey={(matrixIdx) => device.setRgbColor(matrixIdx, paintColor)}
            onPickColor={(c) => setPaintColor(c)}
            onFillAll={() => device.fillAllRgb(paintColor)}
            onPaintColorChange={setPaintColor}
          />

          {inspectorOpen &&
            (activeTab === 'keymap' ? (
              <KeymapInspector
                t={t}
                locale={locale}
                activeLayer={activeLayer}
                onLayerChange={setActiveLayer}
                selectedKey={selectedKey}
                onSelectKnob={() => setSelectedKeyId('K82')}
                draftKeymap={draftKeymap}
                onAssignCode={device.setKeyEntry}
                onResetKey={device.resetKeyToDefault}
              />
            ) : (
              <LightingPanel
                t={t}
                locale={locale}
                config={device.draft.config}
                palette={device.draft.palette}
                onUpdateConfig={device.updateConfig}
                onUpdateSlot={device.updateSlot}
                onUpdatePaletteColor={device.updatePaletteColor}
              />
            ))}
        </main>
      </div>
    </div>
  );
}

export default App;
