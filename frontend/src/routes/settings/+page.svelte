<script lang="ts">
  import { onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import { apiFetch } from "$lib/api";
  import { registerPush, unregisterPush } from "$lib/push";
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

<div class="page-stack">
  <section class="page-intro">
    <p class="page-kicker">Einstellungen</p>
    <h1 class="page-title">Benachrichtigungen und App-Status.</h1>
    <p class="page-description">Verwalte deine Push-Benachrichtigungen und prüfe den aktuellen Systemzustand.</p>
  </section>

  <section class="split-grid">
    <Card title="Benachrichtigungen" description="Die App informiert dich über Termine, Material und Rückmeldungen.">
      <div class="actions">
        <button class="btn btn-primary" type="button" on:click={enablePush}>Push aktivieren</button>
        <button class="btn btn-outline" type="button" on:click={disablePush}>Push deaktivieren</button>
      </div>

      {#if message}
        <p class="status-banner">{message}</p>
      {/if}
    </Card>

    <Card title="Systemstatus" description="Technische Schalter und aktuelle Konfiguration.">
      {#if $session?.role !== "admin"}
        <p class="text-muted">Nur Admins sehen die vollständigen Systemwerte.</p>
      {:else if settings.length === 0}
        <p class="text-muted">Keine Statusdaten verfügbar.</p>
      {:else}
        <div class="hairline-list">
          {#each settings as item}
            <div class="list-row">
              <div class="list-meta">
                <strong>{item.key}</strong>
                <span class="text-muted">Aktueller Wert</span>
              </div>
              <span class="badge badge-secondary">{item.value}</span>
            </div>
          {/each}
        </div>
      {/if}
    </Card>
  </section>
</div>
