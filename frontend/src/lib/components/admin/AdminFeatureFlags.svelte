<script lang="ts">
  import { onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import { apiFetch } from "$lib/api";
  import { refreshAppSettings } from "$lib/app-settings";
  import { pushToast } from "$lib/toast";

  let loading = true;
  let saving = false;
  let chatEnabled = false;
  let nfcEnabled = false;

  const load = async () => {
    loading = true;
    try {
      const rows = await apiFetch<Array<{ key: string; value: string }>>("/api/admin/settings");
      chatEnabled = rows.find((row) => row.key === "chat_enabled")?.value === "true";
      nfcEnabled = rows.find((row) => row.key === "nfc_enabled")?.value === "true";
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Feature Flags konnten nicht geladen werden.", "error");
    } finally {
      loading = false;
    }
  };

  const save = async () => {
    if (saving) return;
    saving = true;
    try {
      await apiFetch("/api/admin/feature-flags", {
        method: "POST",
        body: JSON.stringify({
          flags: [
            { key: "chat_enabled", enabled: chatEnabled },
            { key: "nfc_enabled", enabled: nfcEnabled }
          ]
        })
      });
      await refreshAppSettings();
      pushToast("Feature Flags gespeichert.", "success", 1000);
      await load();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Feature Flags konnten nicht gespeichert werden.", "error");
    } finally {
      saving = false;
    }
  };

  onMount(() => {
    void load();
  });
</script>

<section class="section-block">
  <h2 class="section-title">Feature Flags</h2>
  <Card title="Feature Toggle Panel">
    {#if loading}
      <p class="text-muted">Lade Flags...</p>
    {:else}
      <div class="hairline-list">
        <div class="toggle-row">
          <div class="list-meta">
            <strong>Chat aktiv</strong>
            <span class="text-muted">Steuert Chat-Navigation und API-Zugriff.</span>
          </div>
          <label class="toggle">
            <input type="checkbox" bind:checked={chatEnabled} />
          </label>
        </div>
        <div class="toggle-row">
          <div class="list-meta">
            <strong>NFC aktiv</strong>
            <span class="text-muted">Steuert NFC-Bereich.</span>
          </div>
          <label class="toggle">
            <input type="checkbox" bind:checked={nfcEnabled} />
          </label>
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-primary" type="button" disabled={saving} on:click={save}>
          {saving ? "Speichert..." : "Speichern"}
        </button>
      </div>
    {/if}
  </Card>
</section>
