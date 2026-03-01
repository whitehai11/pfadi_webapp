<script lang="ts">
  import { onMount } from "svelte";
  import SegmentedControl from "$lib/components/SegmentedControl.svelte";
  import Avatar from "$lib/components/Avatar.svelte";
  import HeroCard from "$lib/components/heroui/HeroCard.svelte";
  import { apiFetch } from "$lib/api";
  import { registerPush, unregisterPush } from "$lib/push";
  import { session, setSessionProfile } from "$lib/auth";
  import { pushToast } from "$lib/toast";
  import { setThemePreference, themePreference, type ThemePreference } from "$lib/theme";

  type SessionInfo = {
    id: string;
    label: string;
    lastActive: string;
    current: boolean;
  };

  type DeviceInfo = {
    id: string;
    name: string;
    platform: string;
    browser: string;
    current: boolean;
  };

  type PushPreferences = {
    enabled: boolean;
    events: boolean;
    chat: boolean;
    tasks: boolean;
  };

  const STORAGE = {
    pushPrefs: "pfadi_push_preferences",
    chatSound: "pfadi_chat_sound_enabled"
  } as const;

  const themeOptions = [
    { value: "light", label: "Hell" },
    { value: "dark", label: "Dunkel" },
    { value: "system", label: "System" }
  ];

  let message = "";
  let pushError = "";
  let pushLoading: "enable" | "disable" | "" = "";
  let sessionLoadError = "";
  let selectedTheme: ThemePreference = "system";
  let previousTheme: ThemePreference | null = null;
  let chatSoundEnabled = true;
  let pushPrefs: PushPreferences = { enabled: false, events: true, chat: true, tasks: true };
  let sessions: SessionInfo[] = [];
  let devices: DeviceInfo[] = [];
  let avatarUploadLoading = false;
  let avatarError = "";
  let avatarPreviewUrl = "";
  let avatarPreviewFile: File | null = null;
  let avatarInput: HTMLInputElement | null = null;

  const formatTimestamp = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unbekannt";
    return date.toLocaleString("de-DE");
  };

  const parseUserAgent = () => {
    const ua = navigator.userAgent;
    const browser = /Edg\//.test(ua)
      ? "Edge"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
    const platform = (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform || navigator.platform || "Unbekannt";
    return { browser, platform };
  };

  const clearAvatarPreview = () => {
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    avatarPreviewUrl = "";
    avatarPreviewFile = null;
    if (avatarInput) avatarInput.value = "";
  };

  const applyAvatarFile = (file: File | null) => {
    avatarError = "";
    clearAvatarPreview();
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      avatarError = "Nur PNG, JPG oder WEBP.";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      avatarError = "Maximal 2 MB.";
      return;
    }
    avatarPreviewFile = file;
    avatarPreviewUrl = URL.createObjectURL(file);
  };

  const uploadAvatar = async () => {
    if (!avatarPreviewFile || avatarUploadLoading) return;
    avatarUploadLoading = true;
    avatarError = "";
    try {
      const formData = new FormData();
      formData.append("avatar", avatarPreviewFile);
      const result = await apiFetch<{ avatar_url: string | null }>("/api/auth/avatar", {
        method: "POST",
        body: formData
      });
      setSessionProfile({ avatarUrl: result.avatar_url ?? null });
      clearAvatarPreview();
      pushToast("Profilbild gespeichert.", "success", 1200);
    } catch (err) {
      avatarError = err instanceof Error ? err.message : "Profilbild konnte nicht gespeichert werden.";
      pushToast(avatarError, "error");
    } finally {
      avatarUploadLoading = false;
    }
  };

  const persistPushPrefs = () => {
    localStorage.setItem(STORAGE.pushPrefs, JSON.stringify(pushPrefs));
  };

  const loadLocalPrefs = () => {
    const storedChatSound = localStorage.getItem(STORAGE.chatSound);
    if (storedChatSound === "true" || storedChatSound === "false") {
      chatSoundEnabled = storedChatSound === "true";
    }
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE.pushPrefs) || "{}");
      pushPrefs = {
        enabled: Boolean(parsed.enabled),
        events: parsed.events !== false,
        chat: parsed.chat !== false,
        tasks: parsed.tasks !== false
      };
    } catch {
      pushPrefs = { enabled: false, events: true, chat: true, tasks: true };
    }
  };

  const loadTheme = () => {
    const unsub = themePreference.subscribe((value) => {
      selectedTheme = value;
    });
    unsub();
  };

  const loadSessions = async () => {
    sessionLoadError = "";
    const { browser, platform } = parseUserAgent();
    const fallbackSession: SessionInfo = {
      id: "current-session",
      label: "Aktuelle Sitzung",
      lastActive: new Date().toISOString(),
      current: true
    };
    const fallbackDevice: DeviceInfo = {
      id: "current-device",
      name: `${browser} auf ${platform}`,
      platform,
      browser,
      current: true
    };

    try {
      const result = await apiFetch<Array<Record<string, unknown>>>("/api/auth/sessions", { toastOnError: false });
      if (!Array.isArray(result) || result.length === 0) {
        sessions = [fallbackSession];
        devices = [fallbackDevice];
        return;
      }

      sessions = result.map((item, index) => ({
        id: String(item.id ?? `session-${index}`),
        label: String(item.label ?? item.device_name ?? `Sitzung ${index + 1}`),
        lastActive: String(item.last_active ?? item.updated_at ?? new Date().toISOString()),
        current: Boolean(item.current)
      }));

      devices = result.map((item, index) => ({
        id: String(item.id ?? `device-${index}`),
        name: String(item.device_name ?? item.user_agent ?? `Gerät ${index + 1}`),
        platform: String(item.platform ?? platform),
        browser: String(item.browser ?? browser),
        current: Boolean(item.current)
      }));
    } catch {
      sessions = [fallbackSession];
      devices = [fallbackDevice];
      sessionLoadError = "Nur aktuelle Sitzung verfügbar.";
    }
  };

  const enablePush = async () => {
    if (pushLoading) return;
    pushLoading = "enable";
    message = "";
    pushError = "";
    try {
      await registerPush();
      pushPrefs.enabled = true;
      persistPushPrefs();
      message = "Push aktiviert.";
      pushToast(message, "success", 1200);
    } catch (err) {
      pushError = err instanceof Error ? err.message : "Push konnte nicht aktiviert werden.";
      pushToast(pushError, "error");
    } finally {
      pushLoading = "";
    }
  };

  const disablePush = async () => {
    if (pushLoading) return;
    pushLoading = "disable";
    message = "";
    pushError = "";
    try {
      await unregisterPush();
      pushPrefs.enabled = false;
      persistPushPrefs();
      message = "Push deaktiviert.";
      pushToast(message, "success", 1200);
    } catch (err) {
      pushError = err instanceof Error ? err.message : "Push konnte nicht deaktiviert werden.";
      pushToast(pushError, "error");
    } finally {
      pushLoading = "";
    }
  };

  const toggleChatSound = (enabled: boolean) => {
    chatSoundEnabled = enabled;
    localStorage.setItem(STORAGE.chatSound, String(enabled));
    pushToast("Chat-Ton gespeichert.", "success", 1000);
  };

  const togglePushCategory = (key: "events" | "chat" | "tasks", enabled: boolean) => {
    pushPrefs = { ...pushPrefs, [key]: enabled };
    persistPushPrefs();
  };

  onMount(async () => {
    loadTheme();
    loadLocalPrefs();
    await loadSessions();
  });

  $: if (previousTheme !== null && selectedTheme !== previousTheme) {
    setThemePreference(selectedTheme);
    pushToast("Design gespeichert.", "success", 1000);
  }

  $: previousTheme = selectedTheme;
</script>

<div class="page-stack">
  <section class="page-intro">
    <h1 class="page-title">Einstellungen</h1>
  </section>

  <HeroCard title="Profil">
    <div class="settings-profile">
      <Avatar name={$session?.username || "User"} avatarUrl={avatarPreviewUrl || $session?.avatarUrl || null} size={96} />
      <div class="settings-profile__actions">
        <input
          bind:this={avatarInput}
          class="hidden-input"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          on:change={(event) => applyAvatarFile((event.currentTarget as HTMLInputElement).files?.[0] ?? null)}
        />
        <button class="btn btn-outline" type="button" on:click={() => avatarInput?.click()} disabled={avatarUploadLoading}>
          Bild wählen
        </button>
        <button class="btn btn-primary" type="button" on:click={uploadAvatar} disabled={!avatarPreviewFile || avatarUploadLoading}>
          {avatarUploadLoading ? "Speichern..." : "Speichern"}
        </button>
      </div>
    </div>
    {#if avatarPreviewFile}
      <p class="text-muted">{avatarPreviewFile.name} · {(avatarPreviewFile.size / 1024).toFixed(0)} KB</p>
    {/if}
    {#if avatarError}
      <p class="status-banner error">{avatarError}</p>
    {/if}
  </HeroCard>

  <HeroCard title="Design">
    <SegmentedControl bind:value={selectedTheme} options={themeOptions} ariaLabel="Theme" />
  </HeroCard>

  <HeroCard title="Benachrichtigungen">
    <div class="actions">
      <button class="btn btn-primary" type="button" disabled={Boolean(pushLoading)} on:click={enablePush}>
        {pushLoading === "enable" ? "Aktiviere..." : "Push aktivieren"}
      </button>
      <button class="btn btn-outline" type="button" disabled={Boolean(pushLoading)} on:click={disablePush}>
        {pushLoading === "disable" ? "Deaktiviere..." : "Push deaktivieren"}
      </button>
    </div>

    <div class="hairline-list">
      <div class="toggle-row">
        <div class="list-meta">
          <strong>Termine</strong>
        </div>
        <label class="toggle">
          <input
            type="checkbox"
            checked={pushPrefs.events}
            disabled={!pushPrefs.enabled}
            on:change={(event) => togglePushCategory("events", (event.currentTarget as HTMLInputElement).checked)}
          />
        </label>
      </div>
      <div class="toggle-row">
        <div class="list-meta">
          <strong>Chat</strong>
        </div>
        <label class="toggle">
          <input
            type="checkbox"
            checked={pushPrefs.chat}
            disabled={!pushPrefs.enabled}
            on:change={(event) => togglePushCategory("chat", (event.currentTarget as HTMLInputElement).checked)}
          />
        </label>
      </div>
      <div class="toggle-row">
        <div class="list-meta">
          <strong>Aufgaben</strong>
        </div>
        <label class="toggle">
          <input
            type="checkbox"
            checked={pushPrefs.tasks}
            disabled={!pushPrefs.enabled}
            on:change={(event) => togglePushCategory("tasks", (event.currentTarget as HTMLInputElement).checked)}
          />
        </label>
      </div>
      <div class="toggle-row">
        <div class="list-meta">
          <strong>Chat-Ton</strong>
        </div>
        <label class="toggle">
          <input
            type="checkbox"
            checked={chatSoundEnabled}
            on:change={(event) => toggleChatSound((event.currentTarget as HTMLInputElement).checked)}
          />
        </label>
      </div>
    </div>

    {#if message}
      <p class="status-banner success">{message}</p>
    {/if}
    {#if pushError}
      <p class="status-banner error">{pushError}</p>
    {/if}
  </HeroCard>

  <HeroCard title="Sitzungen">
    <div class="hairline-list">
      {#each sessions as sessionItem}
        <div class="list-row">
          <div class="list-meta">
            <strong>{sessionItem.label}</strong>
            <span class="text-muted">Zuletzt aktiv: {formatTimestamp(sessionItem.lastActive)}</span>
          </div>
          <span class={sessionItem.current ? "badge badge-success" : "badge badge-secondary"}>
            {sessionItem.current ? "Aktiv" : "Inaktiv"}
          </span>
        </div>
      {/each}
    </div>
    {#if sessionLoadError}
      <p class="text-muted">{sessionLoadError}</p>
    {/if}
  </HeroCard>

  <HeroCard title="Geräte">
    <div class="hairline-list">
      {#each devices as device}
        <div class="list-row">
          <div class="list-meta">
            <strong>{device.name}</strong>
            <span class="text-muted">{device.browser} · {device.platform}</span>
          </div>
          <span class={device.current ? "badge badge-success" : "badge badge-secondary"}>
            {device.current ? "Dieses Gerät" : "Bekannt"}
          </span>
        </div>
      {/each}
    </div>
  </HeroCard>
</div>

<style>
  .settings-profile {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .settings-profile__actions {
    display: flex;
    gap: var(--space-1);
    flex-wrap: wrap;
  }

  .hidden-input {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
  }
</style>
