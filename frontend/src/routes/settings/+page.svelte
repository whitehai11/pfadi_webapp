<script lang="ts">
  import { registerPush, unregisterPush } from "$lib/push";
  import { apiFetch } from "$lib/api";
  import { onMount } from "svelte";
  import { session } from "$lib/auth";

  let settings: any[] = [];
  let message = "";

  const loadSettings = async () => {
    try {
      settings = await apiFetch("/api/settings");
    } catch {
      settings = [];
    }
  };

  const enablePush = async () => {
    message = "";
    try {
      await registerPush();
      message = "Push aktiviert.";
    } catch {
      message = "Push konnte nicht aktiviert werden.";
    }
  };

  const disablePush = async () => {
    message = "";
    try {
      await unregisterPush();
      message = "Push deaktiviert.";
    } catch {
      message = "Push konnte nicht deaktiviert werden.";
    }
  };

  onMount(loadSettings);
</script>

<section class="card-grid grid-2">
  <div class="card">
    <h2 class="page-title">Einstellungen</h2>
    <p class="text-muted">Push-Benachrichtigungen und Status.</p>
    <div class="actions">
      <button class="btn btn-primary" on:click={enablePush}>Push aktivieren</button>
      <button class="btn btn-outline" on:click={disablePush}>Push deaktivieren</button>
    </div>
    {#if message}
      <p class="text-muted">{message}</p>
    {/if}
  </div>
  {#if $session?.role === 'admin'}
    <div class="card">
      <h3 class="section-title">Feature-Status</h3>
      {#if settings.length === 0}
        <p class="text-muted">Keine Feature-Daten verfügbar.</p>
      {:else}
        {#each settings as item}
          <div class="actions actions-between">
            <span>{item.key}</span>
            <span class="badge badge-secondary">{item.value}</span>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</section>
