<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { session, restoreSession, clearToken, roleLabel } from "$lib/auth";
  import { registerPush } from "$lib/push";
  import LoadingScreen from "$lib/components/LoadingScreen.svelte";
  import "$lib/styles/app.css";

  let isReady = false;

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

  onMount(async () => {
    restoreSession();
    if ("serviceWorker" in navigator) {
      try {
        await navigator.serviceWorker.register("/service-worker.js");
      } catch (err) {
        console.warn("Service worker registration failed", err);
      }
    }
    await requestInitialPermissions();
    isReady = true;
  });
</script>

<svelte:head>
  <title>Pfadfinder Orga</title>
</svelte:head>

{#if !isReady}
  <LoadingScreen />
{/if}

<div class="app-shell">
  {#if $session}
    <header class="topbar">
      <div class="topbar-inner">
      <nav class="nav">
          <a href="/">Übersicht</a>
        <a href="/calendar">Kalender</a>
        <a href="/inventory">Material</a>
        <a href="/nfc">NFC</a>
        <a href="/packlists">Packlisten</a>
          <a href="/settings">Einstellungen</a>
          {#if $session?.role === 'admin'}
            <a href="/admin">Admin</a>
          {/if}
        </nav>
        <div class="user-menu">
          <span>{$session.username} ({roleLabel($session.role)})</span>
          <button class="btn btn-outline" on:click={clearToken}>Abmeldung</button>
        </div>
      </div>
    </header>
  {/if}

  <main class={$session ? "container" : "auth-container"}>
    <slot />
  </main>
</div>
