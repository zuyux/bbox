export const DEVELOPER_MODE_STORAGE_KEY = 'bbox_developer_mode';

export function isDeveloperModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(DEVELOPER_MODE_STORAGE_KEY) === 'true';
}

export function setDeveloperModeEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DEVELOPER_MODE_STORAGE_KEY, enabled ? 'true' : 'false');
  window.dispatchEvent(new Event('bbox-developer-mode-change'));
}
