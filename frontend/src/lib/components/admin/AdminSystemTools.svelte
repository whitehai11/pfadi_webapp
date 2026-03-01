<script lang="ts">
  import { onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import { apiFetch } from "$lib/api";
  import { refreshAppSettings } from "$lib/app-settings";
  import { pushToast } from "$lib/toast";

  type AdminSetting = {
    key: "nfc_enabled" | "chat_enabled" | "quiet_hours_start" | "quiet_hours_end" | string;
    value: string;
    updated_at: string;
  };

  type HealthStatus = {
    status: string;
    uptimeSeconds: number;
  };

  type VersionStatus = {
    version: string;
    commit: string;
    updated_at: string;
  };

  let loading = true;
  let saving = false;
  let chatEnabled = false;
  let nfcEnabled = false;
  let quietStart = "21:00";
  let quietEnd = "06:00";
  let health: HealthStatus | null = null;
  let version: VersionStatus | null = null;

  const mapSettings = (rows: AdminSetting[]) => {
    chatEnabled = rows.find((row) => row.key === "chat_enabled")?.value === "true";
    nfcEnabled = rows.find((row) => row.key === "nfc_enabled")?.value === "true";
    quietStart = rows.find((row) => row.key === "quiet_hours_start")?.value || "21:00";
    quietEnd = rows.find((row) => row.key === "quiet_hours_end")?.value || "06:00";
  };

  const loadSettings = async () => {
    loading = true;
    try {
      const rows = await apiFetch<AdminSetting[]>("/api/admin/settings");
      mapSettings(rows);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Admin-Settings konnten nicht geladen werden.", "error");
    } finally {
      loading = false;
    }
  };

  const saveSettings = async () => {
    if (saving) return;
    saving = true;
    try {
      await apiFetch("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify([
          { key: "chat_enabled", value: String(chatEnabled) },
          { key: "nfc_enabled", value: String(nfcEnabled) },
          { key: "quiet_hours_start", value: quietStart },
          { key: "quiet_hours_end", value: quietEnd }
        ])
      });
      await refreshAppSettings();
      pushToast("Admin-Einstellungen gespeichert.", "success", 1000);
      await loadSettings();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Speichern fehlgeschlagen.", "error");
    } finally {
      saving = false;
    }
  };

  const runHealthCheck = async () => {
    try {
      health = await apiFetch<HealthStatus>("/api/health");
      pushToast("Health-Check erfolgreich.", "success", 900);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Health-Check fehlgeschlagen.", "error");
    }
  };

  const loadVersion = async () => {
    try {
      version = await apiFetch<VersionStatus>("/api/system/version");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Version konnte nicht geladen werden.", "error");
    }
  };

  onMount(() => {
    void loadSettings();
    void loadVersion();
  });
</script>

<section class="section-block">
  <h2 class="section-title">System Actions</h2>

  <Card title="Feature Toggles">
    {#if loading}
      <p class="text-muted">Lade Einstellungen...</p>
    {:else}
      <div class="hairline-list">
        <div class="toggle-row">
          <div class="list-meta">
            <strong>Chat aktivieren</strong>
            <span class="text-muted">Navigation und Chat-API werden freigeschaltet.</span>
          </div>
          <label class="toggle">
            <input type="checkbox" bind:checked={chatEnabled} />
          </label>
        </div>

        <div class="toggle-row">
          <div class="list-meta">
            <strong>NFC aktivieren</strong>
            <span class="text-muted">NFC-Bereich wird freigeschaltet.</span>
          </div>
          <label class="toggle">
            <input type="checkbox" bind:checked={nfcEnabled} />
          </label>
        </div>
      </div>
    {/if}
  </Card>

  <Card title="Settings Panel">
    <div class="form-grid grid-2">
      <label>
        <span>Quiet Hours Start</span>
        <input class="input" type="time" bind:value={quietStart} />
      </label>
      <label>
        <span>Quiet Hours End</span>
        <input class="input" type="time" bind:value={quietEnd} />
      </label>
    </div>
    <div class="actions">
      <button class="btn btn-primary" type="button" disabled={saving || loading} on:click={saveSettings}>
        {saving ? "Speichert..." : "Speichern"}
      </button>
    </div>
  </Card>

  <Card title="System-Status">
    <div class="actions">
      <button class="btn btn-outline" type="button" on:click={runHealthCheck}>Health prüfen</button>
      <button class="btn btn-outline" type="button" on:click={loadVersion}>Version laden</button>
    </div>
    <div class="hairline-list">
      <div class="list-row">
        <div class="list-meta">
          <strong>Health</strong>
          <span class="text-muted">{health ? `${health.status} · ${health.uptimeSeconds}s` : "-"}</span>
        </div>
      </div>
      <div class="list-row">
        <div class="list-meta">
          <strong>Version</strong>
          <span class="text-muted">{version ? `${version.version} (${version.commit})` : "-"}</span>
        </div>
      </div>
    </div>
  </Card>

  <Card title="Logs">
    <p class="text-muted">Keine direkte Log-API aktiv. Logs laufen serverseitig (Container/Host).</p>
  </Card>
</section>
