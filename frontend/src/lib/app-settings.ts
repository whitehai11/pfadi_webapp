// engineered by Maro Elias Goth
import { writable } from "svelte/store";
import { apiFetch } from "./api";

export type AppSettingsState = {
  chatEnabled: boolean;
  nfcEnabled: boolean;
};

const defaultState: AppSettingsState = {
  chatEnabled: false,
  nfcEnabled: false
};

export const appSettings = writable<AppSettingsState>(defaultState);

export const resetAppSettings = () => {
  appSettings.set(defaultState);
};

export const refreshAppSettings = async () => {
  try {
    const rows = (await apiFetch("/api/settings")) as { key: string; value: string }[];
    const next = rows.reduce<AppSettingsState>(
      (state, row) => {
        if (row.key === "chat_enabled") state.chatEnabled = row.value === "true";
        if (row.key === "nfc_enabled") state.nfcEnabled = row.value === "true";
        return state;
      },
      { ...defaultState }
    );
    appSettings.set(next);
    return next;
  } catch {
    resetAppSettings();
    return defaultState;
  }
};
