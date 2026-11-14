import { useState } from 'react';
import { HeaderBar, type ActiveTab } from './components/HeaderBar';
import { KeyboardVisual, type RgbTool } from './components/KeyboardVisual';
import { KeymapInspector } from './components/KeymapInspector';
import { LightingPanel } from './components/LightingPanel';
import { IconAlert, IconCheck, IconReset } from './components/Icons';
import { HI75C_KEYS, HI75C_KEY_BY_ID } from './data/hi75cLayout';
import { useKeyboardDevice } from './hooks/useKeyboardDevice';
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

  return (
    <div className="app-shell">
      <HeaderBar
        t={t}
        locale={locale}
        onToggleLocale={toggleLocale}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        connectionState={device.connectionState}
        isAsleep={device.isAsleep}
        battery={device.battery}
        webHidSupported={device.webHidSupported}
        inspectorOpen={inspectorOpen}
        onToggleInspector={() => setInspectorOpen((v) => !v)}
        onConnect={() => void device.connect()}
        onRefreshBattery={() => void device.refreshBattery()}
        onExportProfile={handleExportProfile}
        onImportProfile={(raw) => {
          device.importProfileJson(raw);
        }}
      />

      {(!device.webHidSupported || device.errorMessage || device.missingFnKey) && (
        <div className="alerts-stack">
          {!device.webHidSupported && (
            <div className="alert-banner error">
              <IconAlert />
              <span>{t.status.unsupportedWebHid}</span>
            </div>
          )}

          {device.errorMessage && (
            <div className="alert-banner error">
              <IconAlert />
              <span>{device.errorMessage}</span>
            </div>
          )}

          {device.missingFnKey && (
            <div className="alert-banner warning">
              <IconAlert />
              <span>{t.keymap.missingFnWarning}</span>
            </div>
          )}
        </div>
      )}

      <main className={`workspace-main ${inspectorOpen ? 'with-inspector' : 'focus-mode'}`}>
        <div className="stage-column">
          <KeyboardVisual
            t={t}
            locale={locale}
            mode={visualMode}
            activeLayer={activeLayer}
            onLayerChange={setActiveLayer}
            selectedKeyId={selectedKeyId}
            onSelectKey={(k) => {
              setSelectedKeyId(k.id);
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

          {device.diff.totalPending > 0 && (
            <div className="pending-dock" role="status">
              <div className="pending-dock-info">
                <span className="pending-dot" />
                <span className="tabular-nums">
                  {t.feedback.pendingChanges(device.diff.totalPending)}
                </span>
              </div>
              <div className="pending-dock-actions">
                <button type="button" className="btn" onClick={device.revertChanges}>
                  <IconReset />
                  <span>{t.actions.revert}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-amber"
                  disabled={device.connectionState !== 'connected' || device.isApplying}
                  onClick={() => void device.applyChanges()}
                >
                  <IconCheck />
                  <span>{t.actions.apply}</span>
                </button>
              </div>
            </div>
          )}
        </div>

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
  );
}

export default App;
