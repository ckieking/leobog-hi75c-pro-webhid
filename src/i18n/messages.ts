export type Locale = 'zh-TW' | 'en';

export interface Messages {
  appName: string;
  appSubtitle: string;
  titleConnected: (percent: number) => string;
  titleAsleep: (percent: number | null) => string;
  status: {
    disconnected: string;
    connecting: string;
    syncing: string;
    connected: string;
    asleep: string;
    charging: string;
    unsupportedWebHid: string;
  };
  actions: {
    connect: string;
    refresh: string;
    apply: string;
    revert: string;
    exportProfile: string;
    importProfile: string;
    resetKey: string;
    listenKey: string;
    listening: string;
    cancel: string;
    confirm: string;
    paint: string;
    fillAll: string;
    eyedropper: string;
    toggleInspector: string;
    switchLanguage: string;
  };
  tabs: {
    keymap: string;
    lighting: string;
  };
  telemetry: {
    layerLabel: string;
    encoderLabel: string;
    lightingLabel: string;
    syncLabel: string;
    synced: string;
    perKeyRgbActive: string;
    offState: string;
  };
  keymap: {
    baseLayer: string;
    fn1Layer: string;
    knob: string;
    selectedKey: string;
    noKeySelected: string;
    currentMapping: string;
    defaultMapping: string;
    modifiers: string;
    searchPlaceholder: string;
    groupStandard: string;
    groupModifier: string;
    groupConsumer: string;
    groupFirmware: string;
    groupSpecial: string;
    missingFnWarning: string;
    resetConfirmTitle: string;
    resetConfirmBody: string;
  };
  lighting: {
    effectsTitle: string;
    brightness: string;
    speed: string;
    color: string;
    multicolor: string;
    customColor: string;
    perKeyRgb: string;
    perKeyModeOn: string;
    winLock: string;
    sleepTimer: string;
  };
  feedback: {
    saved: string;
    reverted: string;
    exported: string;
    imported: string;
    importError: string;
    writeError: string;
    writeRejected24g: (target: string) => string;
    syncError: string;
    batteryError: string;
    pendingChanges: (count: number) => string;
  };
}

export const MESSAGES: Record<Locale, Messages> = {
  'zh-TW': {
    appName: 'LEOBOG Hi75C Pro',
    appSubtitle: '75% CNC AL6063 · 81 鍵與 K82 旋鈕編碼器 · WebHID',
    titleConnected: (percent) => `[${percent}%] LEOBOG Hi75C Pro`,
    titleAsleep: (percent) =>
      percent !== null ? `[休眠 · ${percent}%] LEOBOG Hi75C Pro` : `[休眠] LEOBOG Hi75C Pro`,
    status: {
      disconnected: '未連線',
      connecting: '連線中',
      syncing: '同步中',
      connected: '已連線',
      asleep: '休眠中',
      charging: '充電中',
      unsupportedWebHid: '此瀏覽器不支援 WebHID，請使用 Chrome 或 Edge。',
    },
    actions: {
      connect: '連線鍵盤',
      refresh: '重新整理',
      apply: '儲存套用',
      revert: '還原',
      exportProfile: '匯出設定檔',
      importProfile: '匯入設定檔',
      resetKey: '重設此鍵',
      listenKey: '按鍵偵測',
      listening: '請按下按鍵…',
      cancel: '取消',
      confirm: '確認',
      paint: '單鍵塗色',
      fillAll: '全部填滿',
      eyedropper: '吸管取色',
      toggleInspector: '切換檢視面板',
      switchLanguage: '切換為 English',
    },
    tabs: {
      keymap: '改鍵',
      lighting: '燈效',
    },
    telemetry: {
      layerLabel: '目前層級',
      encoderLabel: '旋鈕',
      lightingLabel: '燈效',
      syncLabel: '設定狀態',
      synced: '已同步',
      perKeyRgbActive: '單鍵自訂 RGB',
      offState: '關閉',
    },
    keymap: {
      baseLayer: '基礎層',
      fn1Layer: 'FN1 層',
      knob: '旋鈕',
      selectedKey: '已選取按鍵',
      noKeySelected: '點選鍵盤上的按鍵或旋鈕',
      currentMapping: '目前功能',
      defaultMapping: '原廠預設',
      modifiers: '組合修飾鍵',
      searchPlaceholder: '搜尋鍵碼或功能…',
      groupStandard: '標準按鍵',
      groupModifier: '修飾鍵',
      groupConsumer: '多媒體',
      groupFirmware: '韌體功能',
      groupSpecial: '特殊鍵',
      missingFnWarning: '基礎層尚未指定 FN 鍵，將無法切換 FN1 層。',
      resetConfirmTitle: '確認恢復原廠設定？',
      resetConfirmBody: '此操作將清除所有自訂改鍵與燈效設定。',
    },
    lighting: {
      effectsTitle: '燈效模式',
      brightness: '亮度',
      speed: '速度',
      color: '顏色',
      multicolor: '七彩循環',
      customColor: '自訂 RGB',
      perKeyRgb: '自訂單鍵 RGB',
      perKeyModeOn: '單鍵自訂',
      winLock: '鎖定 Win 鍵',
      sleepTimer: '無線休眠',
    },
    feedback: {
      saved: '已儲存至鍵盤',
      reverted: '已還原變更',
      exported: '已匯出設定檔',
      imported: '已匯入設定檔',
      importError: '設定檔格式無效',
      writeError: '寫入鍵盤失敗',
      writeRejected24g: (target) => `2.4G 韌體未寫入「${target}」（可能需要改用有線 USB 模式）`,
      syncError: '讀取鍵盤狀態失敗',
      batteryError: '無法讀取電量',
      pendingChanges: (count) => `${count} 項待套用`,
    },
  },
  en: {
    appName: 'LEOBOG Hi75C Pro',
    appSubtitle: '75% CNC AL6063 · 81 Keys + K82 Encoder · WebHID',
    titleConnected: (percent) => `[${percent}%] LEOBOG Hi75C Pro`,
    titleAsleep: (percent) =>
      percent !== null ? `[Asleep · ${percent}%] LEOBOG Hi75C Pro` : `[Asleep] LEOBOG Hi75C Pro`,
    status: {
      disconnected: 'Disconnected',
      connecting: 'Connecting',
      syncing: 'Syncing',
      connected: 'Connected',
      asleep: 'Asleep',
      charging: 'Charging',
      unsupportedWebHid: 'WebHID is not supported in this browser. Use Chrome or Edge.',
    },
    actions: {
      connect: 'Connect',
      refresh: 'Refresh',
      apply: 'Apply',
      revert: 'Revert',
      exportProfile: 'Export',
      importProfile: 'Import',
      resetKey: 'Reset Key',
      listenKey: 'Listen',
      listening: 'Press a key…',
      cancel: 'Cancel',
      confirm: 'Confirm',
      paint: 'Paint',
      fillAll: 'Fill All',
      eyedropper: 'Eyedropper',
      toggleInspector: 'Toggle Inspector',
      switchLanguage: 'Switch to Traditional Chinese',
    },
    tabs: {
      keymap: 'Keymap',
      lighting: 'Lighting',
    },
    telemetry: {
      layerLabel: 'Active Layer',
      encoderLabel: 'Knob',
      lightingLabel: 'Lighting',
      syncLabel: 'Status',
      synced: 'In sync',
      perKeyRgbActive: 'Per-Key RGB',
      offState: 'Off',
    },
    keymap: {
      baseLayer: 'Base',
      fn1Layer: 'FN1',
      knob: 'Knob',
      selectedKey: 'Selected Key',
      noKeySelected: 'Select a key or knob',
      currentMapping: 'Assigned',
      defaultMapping: 'Default',
      modifiers: 'Modifiers',
      searchPlaceholder: 'Search keys or functions…',
      groupStandard: 'Standard',
      groupModifier: 'Modifiers',
      groupConsumer: 'Media',
      groupFirmware: 'Firmware',
      groupSpecial: 'Special',
      missingFnWarning: 'No FN key is mapped on the Base layer; FN1 layer will be unreachable.',
      resetConfirmTitle: 'Factory Reset?',
      resetConfirmBody: 'This will erase all custom keymaps and lighting settings.',
    },
    lighting: {
      effectsTitle: 'Effects',
      brightness: 'Brightness',
      speed: 'Speed',
      color: 'Color',
      multicolor: 'Multicolor',
      customColor: 'Custom RGB',
      perKeyRgb: 'Per-Key RGB',
      perKeyModeOn: 'Per-Key',
      winLock: 'Win Lock',
      sleepTimer: 'Sleep Timer',
    },
    feedback: {
      saved: 'Saved to keyboard',
      reverted: 'Changes reverted',
      exported: 'Profile exported',
      imported: 'Profile imported',
      importError: 'Invalid profile JSON',
      writeError: 'Failed to write to keyboard',
      writeRejected24g: (target) =>
        `2.4G firmware ignored "${target}" write (wired USB mode may be required)`,
      syncError: 'Failed to sync keyboard state',
      batteryError: 'Failed to read battery',
      pendingChanges: (count) => `${count} pending`,
    },
  },
};
