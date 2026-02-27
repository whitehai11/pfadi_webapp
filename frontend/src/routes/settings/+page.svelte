<script lang="ts">
  import { onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import { apiFetch } from "$lib/api";
  import { registerPush, unregisterPush } from "$lib/push";
  import { session } from "$lib/auth";

  type SettingItem = {
    key: string;
    value: string;
    updated_at: string;
  };

  type VersionInfo = {
    version: string;
    commit: string;
    updated_at: string;
  };

  let settings: SettingItem[] = [];
  let versionInfo: VersionInfo | null = null;
  let message = "";

  const loadSettings = async () => {
    try {
      settings = await apiFetch("/api/settings");
    } catch {
      settings = [];
    }
  };

  const loadVersion = async () => {
    try {
      versionInfo = await apiFetch("/api/system/version");
    } catch {
      versionInfo = null;
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

  const formatTimestamp = (value: string) => {
    if (!value) return "Unbekannt";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  };

  onMount(async () => {
    await Promise.all([loadSettings(), loadVersion()]);
  });
</script>

<div class="page-stack">
  <section class="page-intro">
    <p class="page-kicker">Einstellungen</p>
    <h1 class="page-title">Benachrichtigungen und App-Status.</h1>
    <p class="page-description">Verwalte Push und prufe den aktuellen Versionsstand.</p>
  </section>

  <section class="split-grid">
    <Card title="Benachrichtigungen">
      <div class="actions">
        <button class="btn btn-primary" type="button" on:click={enablePush}>Push aktivieren</button>
        <button class="btn btn-outline" type="button" on:click={disablePush}>Push deaktivieren</button>
      </div>

      {#if message}
        <p class="status-banner">{message}</p>
      {/if}
    </Card>

    <Card title="Systemstatus">
      <div class="hairline-list">
        <div class="list-row">
          <div class="list-meta">
            <strong>Aktuelle Version</strong>
            <span class="text-muted">Stand der laufenden Anwendung</span>
          </div>
          <span class="badge badge-secondary">{versionInfo?.version ?? "Unbekannt"}</span>
        </div>

        <div class="list-row">
          <div class="list-meta">
            <strong>Commit</strong>
            <span class="text-muted">Zuletzt ausgerollter Stand</span>
          </div>
          <span class="badge badge-secondary">{versionInfo?.commit ?? "Unbekannt"}</span>
        </div>

        <div class="list-row">
          <div class="list-meta">
            <strong>Letztes Update</strong>
            <span class="text-muted">Zeitpunkt der letzten erfolgreichen Aktualisierung</span>
          </div>
          <span class="badge badge-secondary">{versionInfo ? formatTimestamp(versionInfo.updated_at) : "Unbekannt"}</span>
        </div>

        <div class="list-row">
          <div class="list-meta">
            <strong>Auto Update</strong>
            <span class="text-muted">Geplanter Lauf alle 12 Stunden</span>
          </div>
          <span class="badge badge-success">Aktiv</span>
        </div>

        {#if $session?.role === "admin" && settings.length > 0}
          {#each settings as item}
            <div class="list-row">
              <div class="list-meta">
                <strong>{item.key}</strong>
                <span class="text-muted">Aktueller Wert</span>
              </div>
              <span class="badge badge-secondary">{item.value}</span>
            </div>
          {/each}
        {/if}
      </div>
    </Card>
  </section>
</div>
