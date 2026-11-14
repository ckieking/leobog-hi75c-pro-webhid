import { useRef } from 'react';
import type { ConnectionState } from '../hooks/useKeyboardDevice';
import type { BatteryStatus } from '../protocol/codecs';
import type { Messages, Locale } from '../i18n/messages';
import {
  IconBattery,
  IconBolt,
  IconBrandMark,
  IconDownload,
  IconGlobe,
  IconKeyboard,
  IconKnob,
  IconRefresh,
  IconSidebar,
  IconSun,
  IconUpload,
  IconUsb,
} from './Icons';

export type ActiveTab = 'keymap' | 'lighting';

interface IconRailProps {
  t: Messages;
  locale: Locale;
  activeTab: ActiveTab;
  selectedKeyId: string | null;
  inspectorOpen: boolean;
  onTabChange: (tab: ActiveTab) => void;
  onSelectKnob: () => void;
  onToggleInspector: () => void;
  onToggleLocale: () => void;
  onExportProfile: () => void;
  onImportProfile: (rawJson: string) => void;
}

export function IconRail({
  t,
  locale,
  activeTab,
  selectedKeyId,
  inspectorOpen,
  onTabChange,
  onSelectKnob,
  onToggleInspector,
  onToggleLocale,
  onExportProfile,
  onImportProfile,
}: IconRailProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImportProfile(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const isKnobFocused = activeTab === 'keymap' && selectedKeyId === 'K82';
  const isKeymapFocused = activeTab === 'keymap' && !isKnobFocused;
  const isLightingFocused = activeTab === 'lighting';

  return (
    <nav className="icon-rail" aria-label={t.appName}>
      <div className="rail-group">
        <div className="rail-brand" title={t.appName} aria-hidden="true">
          <IconBrandMark size={20} />
        </div>

        <button
          type="button"
          className={`rail-btn ${isKeymapFocused ? 'active' : ''}`}
          aria-pressed={isKeymapFocused}
          aria-label={t.tabs.keymap}
          title={t.tabs.keymap}
          onClick={() => onTabChange('keymap')}
        >
          <IconKeyboard size={18} />
        </button>

        <button
          type="button"
          className={`rail-btn ${isLightingFocused ? 'active' : ''}`}
          aria-pressed={isLightingFocused}
          aria-label={t.tabs.lighting}
          title={t.tabs.lighting}
          onClick={() => onTabChange('lighting')}
        >
          <IconSun size={18} />
        </button>

        <button
          type="button"
          className={`rail-btn ${isKnobFocused ? 'active' : ''}`}
          aria-pressed={isKnobFocused}
          aria-label={t.keymap.knob}
          title={t.keymap.knob}
          onClick={onSelectKnob}
        >
          <IconKnob size={18} />
        </button>
      </div>

      <div className="rail-divider" aria-hidden="true" />

      <div className="rail-group rail-utilities">
        <button
          type="button"
          className="rail-btn"
          aria-label={t.actions.exportProfile}
          title={t.actions.exportProfile}
          onClick={onExportProfile}
        >
          <IconDownload size={16} />
        </button>

        <button
          type="button"
          className="rail-btn"
          aria-label={t.actions.importProfile}
          title={t.actions.importProfile}
          onClick={() => fileInputRef.current?.click()}
        >
          <IconUpload size={16} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="sr-only-input"
          aria-label={t.actions.importProfile}
          onChange={handleFileChange}
        />

        <button
          type="button"
          className="rail-btn"
          aria-label={`${t.actions.switchLanguage} (${locale})`}
          title={`${t.actions.switchLanguage} · ${locale === 'zh-TW' ? 'EN' : '繁中'}`}
          onClick={onToggleLocale}
        >
          <IconGlobe size={16} />
        </button>

        <button
          type="button"
          className={`rail-btn ${inspectorOpen ? 'active-subtle' : ''}`}
          aria-pressed={inspectorOpen}
          aria-label={t.actions.toggleInspector}
          title={t.actions.toggleInspector}
          onClick={onToggleInspector}
        >
          <IconSidebar size={16} />
        </button>
      </div>
    </nav>
  );
}

interface TopBarProps {
  t: Messages;
  connectionState: ConnectionState;
  isAsleep: boolean;
  battery: BatteryStatus | null;
  webHidSupported: boolean;
  onConnect: () => void;
  onRefreshBattery: () => void;
}

export function TopBar({
  t,
  connectionState,
  isAsleep,
  battery,
  webHidSupported,
  onConnect,
  onRefreshBattery,
}: TopBarProps) {
  const statusBadge = () => {
    if (connectionState === 'connected') {
      return isAsleep
        ? { text: t.status.asleep, cls: 'asleep' }
        : { text: t.status.connected, cls: 'connected' };
    }
    if (connectionState === 'syncing') {
      return { text: t.status.syncing, cls: 'syncing' };
    }
    if (connectionState === 'connecting') {
      return { text: t.status.connecting, cls: 'syncing' };
    }
    return { text: t.status.disconnected, cls: 'disconnected' };
  };

  const badge = statusBadge();
  const isConnectedOrSyncing = connectionState === 'connected' || connectionState === 'syncing';

  return (
    <header className="workspace-topbar">
      <div className="topbar-identity">
        <h1>{t.appName}</h1>
      </div>

      <div className="topbar-controls">
        <span className={`status-pill ${badge.cls}`}>
          <span className="status-dot" aria-hidden="true" />
          {badge.text}
        </span>

        {battery !== null && (
          <div className="battery-chip" title={battery.charging ? t.status.charging : undefined}>
            <IconBattery percent={battery.percent} charging={battery.charging} />
            <code>{battery.percent}%</code>
            {battery.charging && (
              <span className="battery-charging-tag">
                <IconBolt size={11} />
                {t.status.charging}
              </span>
            )}
          </div>
        )}

        {isConnectedOrSyncing && (
          <button
            type="button"
            className="btn-secondary-pill"
            onClick={onRefreshBattery}
            disabled={connectionState === 'syncing'}
            title={t.actions.refresh}
          >
            <IconRefresh size={14} />
            <span>{t.actions.refresh}</span>
          </button>
        )}

        <button
          type="button"
          className="btn-primary-pill"
          onClick={onConnect}
          disabled={
            !webHidSupported || connectionState === 'connecting' || connectionState === 'syncing'
          }
        >
          <IconUsb size={14} />
          <span>{t.actions.connect}</span>
        </button>
      </div>
    </header>
  );
}
