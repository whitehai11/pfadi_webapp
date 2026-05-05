<script lang="ts">
  /*
   ███╗   ███╗ █████╗ ██████╗  ██████╗
   ████╗ ████║██╔══██╗██╔══██╗██╔═══██╗
   ██╔████╔██║███████║██████╔╝██║   ██║
   ██║╚██╔╝██║██╔══██║██╔══██╗██║   ██║
   ██║ ╚═╝ ██║██║  ██║██║  ██║╚██████╔╝
   ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝

   engineered by Maro Elias Goth
  */
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import Navigation from "$lib/components/Navigation.svelte";
  import CommandPalette from "$lib/components/CommandPalette.svelte";
  import Toaster from "$lib/components/Toaster.svelte";
  import UpdateBanner from "$lib/components/UpdateBanner.svelte";
  import { apiFetch } from "$lib/api";
  import { appSettings, refreshAppSettings, resetAppSettings } from "$lib/app-settings";
  import { session, restoreSession, clearToken, roleLabel, setSessionProfile, setToken } from "$lib/auth";
  import { registerPush } from "$lib/push";
  import { appliedTheme, initTheme, toggleTheme } from "$lib/theme";
  import { activeOverlayId, closeOverlay, toggleOverlay } from "$lib/overlay";
  import { startNotificationsRealtime, stopNotificationsRealtime } from "$lib/stores/notifications";
  import "$lib/styles/app.css";
  import { onDestroy, onMount } from "svelte";
  import { get } from "svelte/store";

  const NAV_OVERLAY_ID = "main-navigation";
  let navOpen = false;
  let previousPath = "";
  let versionPollHandle: number | null = null;
  let tokenRefreshHandle: number | null = null;
  let currentVersion = "";
  let pendingVersion = "";
  let showUpdateBanner = false;
  const signatureFlagKey = "__PFADI_SIGNATURE_LOGGED__" as const;
  const buildVersion = String(import.meta.env.VITE_APP_VERSION ?? "dev");
  const commitHash = String(import.meta.env.VITE_GIT_COMMIT ?? "dev");
  const appEnvironment = String(import.meta.env.MODE ?? "development");
  const showSignatureOverride = String(import.meta.env.VITE_SHOW_SIGNATURE ?? "").trim().toLowerCase() === "true";

  const initializePfadiMeta = () => {
    if (!browser) return;
    if (!window.__PFADI_META__) {
      window.__PFADI_META__ = {
        author: "Maro Elias Goth",
        build: buildVersion,
        commit: commitHash,
        engineered: true,
        environment: appEnvironment
      };
    }
  };

  const logSignatureOnce = () => {
    if (!browser) return;
    if (!(import.meta.env.DEV || showSignatureOverride)) return;
    const win = window as Window & { __PFADI_SIGNATURE_LOGGED__?: boolean };
    if (win[signatureFlagKey]) return;
    win[signatureFlagKey] = true;
    console.log(
      "%cPfadi Orga\n%cengineered by Maro Elias Goth",
      "font-size: 18px; font-weight: bold; color: #0A2540;",
      "font-size: 12px; color: #666;"
    );
  };

  const navItems = [
    { href: "/", label: "Übersicht", icon: "home" as const },
    { href: "/calendar", label: "Kalender", icon: "calendar" as const },
    { href: "/inventory", label: "Material", icon: "inventory" as const },
    { href: "/chat", label: "Chat", icon: "chat" as const },
    { href: "/nfc", label: "NFC", icon: "nfc" as const },
    { href: "/packlists", label: "Packlisten", icon: "packlist" as const },
    { href: "/settings", label: "Einstellungen", icon: "settings" as const }
  ];

  const requestInitialPermissions = async () => {
    const permissionKey = "pfadi_permissions_requested";
    if (typeof localStorage === "undefined") return;
    if (localStorage.getItem(permissionKey) === "true") return;
    if (!get(session)) return;

    localStorage.setItem(permissionKey, "true");

    try {
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
    } catch (err) {
      console.warn("Notification permission failed", err);
    }

    try {
      if ("Notification" in window && Notification.permission === "granted") {
        await registerPush();
      }
    } catch (err) {
      console.warn("Push registration failed", err);
    }
  };

  const stopVersionPolling = () => {
    if (versionPollHandle !== null) {
      clearInterval(versionPollHandle);
      versionPollHandle = null;
    }
  };

  const stopTokenRefresh = () => {
    if (tokenRefreshHandle !== null) {
      clearInterval(tokenRefreshHandle);
      tokenRefreshHandle = null;
    }
  };

  const refreshToken = async () => {
    if (!get(session)) return;
    try {
      const result = await apiFetch("/api/auth/refresh", { method: "POST", toastOnError: false });
      if (result?.token) {
        setToken(result.token);
      }
    } catch {
      clearToken();
      resetAppSettings();
      stopVersionPolling();
      stopTokenRefresh();
    }
  };

  const startTokenRefresh = () => {
    stopTokenRefresh();
    tokenRefreshHandle = window.setInterval(() => {
      void refreshToken();
    }, 10 * 60 * 1000);
  };

  const fetchSystemVersion = async () => {
    if (typeof window === "undefined" || !navigator.onLine || !get(session)) return null;

    try {
      return await apiFetch("/api/system/version");
    } catch {
      return null;
    }
  };

  const checkForVersionUpdate = async () => {
    const versionInfo = await fetchSystemVersion();
    if (!versionInfo?.commit) return;

    if (!currentVersion) {
      currentVersion = versionInfo.commit;
      pendingVersion = "";
      showUpdateBanner = false;
      return;
    }

    if (versionInfo.commit !== currentVersion) {
      pendingVersion = versionInfo.version ?? versionInfo.commit;
      showUpdateBanner = true;
    }
  };

  const startVersionPolling = async () => {
    stopVersionPolling();
    currentVersion = "";
    pendingVersion = "";
    showUpdateBanner = false;

    await checkForVersionUpdate();

    if (typeof window === "undefined") return;
    versionPollHandle = window.setInterval(() => {
      void checkForVersionUpdate();
    }, 60_000);
  };

  onMount(() => {
    initializePfadiMeta();
    logSignatureOnce();

    const handleOnline = () => {
      if (get(session)) {
        void checkForVersionUpdate();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeOverlay();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("keydown", handleKeyDown);

    const init = async () => {
      initTheme();
      restoreSession();
      startNotificationsRealtime();
      if (get(session)) {
        try {
          const profile = await apiFetch<{ username: string; role: "admin" | "dev" | "user" | "materialwart"; avatar_url?: string | null }>(
            "/api/auth/me",
            { toastOnError: false }
          );
          setSessionProfile({
            username: profile.username,
            role: profile.role,
            avatarUrl: profile.avatar_url ?? null
          });
          await refreshAppSettings();
        } catch {
          clearToken();
          resetAppSettings();
          stopVersionPolling();
        }
      }
      if ("serviceWorker" in navigator) {
        try {
          await navigator.serviceWorker.register("/service-worker.js");
        } catch (err) {
          console.warn("Service worker registration failed", err);
        }
      }
      await requestInitialPermissions();
    };

    void init();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("keydown", handleKeyDown);
      stopVersionPolling();
      stopNotificationsRealtime();
    };
  });

  onDestroy(() => {
    stopVersionPolling();
    stopTokenRefresh();
    stopNotificationsRealtime();
  });

  $: if (!get(session)) {
    closeOverlay();
    resetAppSettings();
    stopVersionPolling();
    stopTokenRefresh();
    currentVersion = "";
    pendingVersion = "";
    showUpdateBanner = false;
  }

  $: if ($session && versionPollHandle === null) {
    void startVersionPolling();
  }

  $: if ($session && tokenRefreshHandle === null) {
    startTokenRefresh();
  }

  $: visibleNavItems = navItems.filter((item) => item.href !== "/chat" || $appSettings.chatEnabled);

  $: navOpen = $activeOverlayId === NAV_OVERLAY_ID;

  $: if ($page.url.pathname !== previousPath) {
    previousPath = $page.url.pathname;
    closeOverlay();
  }
</script>

<svelte:head>
  <title>Pfadfinder Orga</title>
</svelte:head>

<div class="app-shell">
  <Toaster />
  {#if $session}
    <CommandPalette isAdmin={$session.role === "admin" || $session.role === "dev"} enabled={true} />
  {/if}

  <UpdateBanner
    visible={showUpdateBanner}
    version={pendingVersion}
    onDismiss={() => (showUpdateBanner = false)}
    onReload={() => window.location.reload()}
  />

  {#if $session}
    <Navigation
      items={[
        ...visibleNavItems,
        ...($session.role === "admin" || $session.role === "dev" ? [{ href: "/admin", label: "Admin", icon: "admin" as const }] : [])
      ]}
      currentPath={$page.url.pathname}
      username={$session.username}
      role={roleLabel($session.role)}
      avatarUrl={$session.avatarUrl ?? null}
      overlayId={NAV_OVERLAY_ID}
      open={navOpen}
      onToggle={() => toggleOverlay(NAV_OVERLAY_ID)}
      onLogout={async () => {
        closeOverlay();
        try {
          await apiFetch("/api/auth/logout", { method: "POST", toastOnError: false });
        } catch {
          // best effort
        }
        clearToken();
      }}
      theme={$appliedTheme}
      onToggleTheme={toggleTheme}
    />
  {/if}

  <main class={$session ? "app-main" : "auth-main"}>
    <div class={$session ? "page-shell" : "auth-shell"}>
      <slot />
    </div>
  </main>
</div>
