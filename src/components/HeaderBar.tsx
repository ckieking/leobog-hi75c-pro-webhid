import { useRef } from 'react';
import type { Locale, Messages } from '../i18n/messages';
import type { BatteryStatus } from '../protocol/codecs';
import type { ConnectionState } from '../hooks/useKeyboardDevice';
import {
  IconBattery,
  IconDownload,
  IconKeyboard,
  IconRefresh,
  IconSidebar,
  IconSun,
  IconUpload,
  IconUsb,
} from './Icons';

export type ActiveTab = 'keymap' | 'lighting';

interface HeaderBarProps {
  t: Messages;
  locale: Locale;
  onToggleLocale: () => void;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  connectionState: ConnectionState;
  isAsleep: boolean;
  battery: BatteryStatus | null;
  webHidSupported: boolean;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  onConnect: () => void;
  onRefreshBattery: () => void;
  onExportProfile: () => void;
  onImportProfile: (rawJson: string) => void;
}

export function HeaderBar({
  t,
  locale,
  onToggleLocale,
  activeTab,
  onTabChange,
  connectionState,
  isAsleep,
  battery,
  webHidSupported,
  inspectorOpen,
  onToggleInspector,
  onConnect,
  onRefreshBattery,
  onExportProfile,
  onImportProfile,
}: HeaderBarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const badgeClass =
    connectionState === 'connected'
      ? isAsleep
        ? 'status-badge asleep'
        : 'status-badge connected'
      : connectionState === 'connecting' || connectionState === 'syncing'
        ? 'status-badge connecting'
        : 'status-badge';

  const badgeText =
    connectionState === 'connected'
      ? isAsleep
        ? t.status.asleep
        : t.status.connected
      : connectionState === 'connecting'
        ? t.status.connecting
        : connectionState === 'syncing'
          ? t.status.syncing
          : t.status.disconnected;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    onImportProfile(text);
  };

  return (
    <header className="header-bar">
      <div className="header-left">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            75C
          </div>
          <span className="brand-title">{t.appName}</span>
        </div>

        <div className="telemetry-cluster">
          <span className={badgeClass}>
            <span className="dot" />
            <span>{badgeText}</span>
          </span>

          {battery && (
            <div className={`battery-pill ${battery.charging ? 'charging' : ''}`}>
              <IconBattery percent={battery.percent} charging={battery.charging} />
              <span className="tabular-nums">{battery.percent}%</span>
              {battery.charging && <span className="battery-state">{t.status.charging}</span>}
            </div>
          )}

          {connectionState === 'connected' && (
            <button
              type="button"
              className="icon-btn"
              onClick={onRefreshBattery}
              title={t.actions.refresh}
              aria-label={t.actions.refresh}
            >
              <IconRefresh />
            </button>
          )}
        </div>

        {connectionState === 'disconnected' && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!webHidSupported}
            onClick={onConnect}
          >
            <IconUsb />
            <span>{t.actions.connect}</span>
          </button>
        )}
      </div>

      <div className="header-center">
        <div className="segmented-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'keymap'}
            className={`tab-btn ${activeTab === 'keymap' ? 'active' : ''}`}
            onClick={() => onTabChange('keymap')}
          >
            <IconKeyboard />
            <span>{t.tabs.keymap}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'lighting'}
            className={`tab-btn ${activeTab === 'lighting' ? 'active' : ''}`}
            onClick={() => onTabChange('lighting')}
          >
            <IconSun />
            <span>{t.tabs.lighting}</span>
          </button>
        </div>
      </div>

      <div className="header-right">
        <button type="button" className="btn btn-ghost" onClick={onExportProfile}>
          <IconDownload />
          <span>{t.actions.exportProfile}</span>
        </button>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => fileInputRef.current?.click()}
        >
          <IconUpload />
          <span>{t.actions.importProfile}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={handleFileChange}
        />

        <button type="button" className="btn btn-ghost lang-btn" onClick={onToggleLocale}>
          {locale === 'zh-TW' ? 'EN' : '繁中'}
        </button>

        <button
          type="button"
          className={`icon-btn ${inspectorOpen ? 'active' : ''}`}
          onClick={onToggleInspector}
          aria-expanded={inspectorOpen}
          title={t.actions.toggleInspector}
          aria-label={t.actions.toggleInspector}
        >
          <IconSidebar />
        </button>
      </div>
    </header>
  );
}
