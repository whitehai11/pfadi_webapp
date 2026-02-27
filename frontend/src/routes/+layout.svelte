<script lang="ts">
  import { page } from "$app/stores";
  import Navigation from "$lib/components/Navigation.svelte";
  import UpdateBanner from "$lib/components/UpdateBanner.svelte";
  import { apiFetch } from "$lib/api";
  import { appSettings, refreshAppSettings, resetAppSettings } from "$lib/app-settings";
  import { session, restoreSession, clearToken, roleLabel } from "$lib/auth";
  import { registerPush } from "$lib/push";
  import "$lib/styles/app.css";
  import { onDestroy, onMount } from "svelte";
  import { get } from "svelte/store";

  let navOpen = false;
  let versionPollHandle: number | null = null;
  let currentVersion = "";
  let pendingVersion = "";
  let showUpdateBanner = false;

  const navItems = [
    { href: "/", label: "Ubersicht", icon: "home" as const },
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
    if (!versionInfo?.version) return;

    if (!currentVersion) {
      currentVersion = versionInfo.version;
      pendingVersion = "";
      showUpdateBanner = false;
      return;
    }

    if (versionInfo.version !== currentVersion) {
      pendingVersion = versionInfo.version;
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
    const handleOnline = () => {
      if (get(session)) {
        void checkForVersionUpdate();
      }
    };

    window.addEventListener("online", handleOnline);

    const init = async () => {
      restoreSession();
      if (get(session)) {
        try {
          await apiFetch("/api/auth/me");
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
      stopVersionPolling();
    };
  });

  onDestroy(() => {
    stopVersionPolling();
  });

  $: if (!get(session)) {
    navOpen = false;
    resetAppSettings();
    stopVersionPolling();
    currentVersion = "";
    pendingVersion = "";
    showUpdateBanner = false;
  }

  $: if ($session && versionPollHandle === null) {
    void startVersionPolling();
  }

  $: visibleNavItems = navItems.filter((item) => item.href !== "/chat" || $appSettings.chatEnabled);
</script>

<svelte:head>
  <title>Pfadfinder Orga</title>
</svelte:head>

<div class="app-shell">
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
        ...($session.role === "admin" ? [{ href: "/admin", label: "Admin", icon: "admin" as const }] : [])
      ]}
      currentPath={$page.url.pathname}
      username={$session.username}
      role={roleLabel($session.role)}
      open={navOpen}
      onToggle={() => (navOpen = !navOpen)}
      onLogout={clearToken}
    />
  {/if}

  <main class={$session ? "app-main" : "auth-main"}>
    <div class={$session ? "page-shell" : "auth-shell"}>
      <slot />
    </div>
  </main>
</div>
