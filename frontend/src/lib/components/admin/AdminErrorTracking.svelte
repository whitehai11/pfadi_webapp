<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import { apiFetch } from "$lib/api";
  import { pushToast } from "$lib/toast";
  import { adminErrorsStore, subscribeAdminChannel } from "$lib/admin/ws/stores";

  type ErrorItem = {
    id: string;
    message: string;
    stack: string | null;
    route: string | null;
    user_id: string | null;
    severity: string;
    resolved: number;
    timestamp: string;
  };

  type ErrorResponse = {
    page: number;
    pageSize: number;
    total: number;
    items: ErrorItem[];
  };

  let severity = "";
  let items: ErrorItem[] = [];
  let loading = true;
  let selected: ErrorItem | null = null;
  let unsubscribeChannel: (() => void) | null = null;
  let unsubscribeStore: (() => void) | null = null;

  const load = async () => {
    loading = true;
    try {
      const query = new URLSearchParams();
      if (severity) query.set("severity", severity);
      const data = await apiFetch<ErrorResponse>(`/api/admin/errors?${query.toString()}`);
      items = data.items ?? [];
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Fehlerdaten konnten nicht geladen werden.", "error");
    } finally {
      loading = false;
    }
  };

  const resolve = async (id: string) => {
    try {
      await apiFetch(`/api/admin/errors/${id}/resolve`, { method: "POST" });
      items = items.map((item) => (item.id === id ? { ...item, resolved: 1 } : item));
      pushToast("Fehler als resolved markiert.", "success", 900);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Resolve fehlgeschlagen.", "error");
    }
  };

  onMount(() => {
    void load();
    unsubscribeChannel = subscribeAdminChannel("errors");
    unsubscribeStore = adminErrorsStore.subscribe((entries) => {
      const normalized = (entries as ErrorItem[]).filter((entry) => !severity || entry.severity === severity);
      if (normalized.length === 0) return;
      items = normalized.slice(0, 300);
    });
  });

  onDestroy(() => {
    unsubscribeChannel?.();
    unsubscribeStore?.();
  });
</script>

<section class="section-block">
  <h2 class="section-title">Live Error Tracking</h2>
  <Card title="Errors">
    <div class="actions">
      <label>
        <span class="text-muted">Severity</span>
        <select bind:value={severity} on:change={() => void load()}>
          <option value="">Alle</option>
          <option value="warn">warn</option>
          <option value="error">error</option>
          <option value="fatal">fatal</option>
        </select>
      </label>
      <button class="btn btn-outline" type="button" on:click={() => void load()}>Refresh</button>
    </div>

    {#if loading}
      <p class="text-muted">Lade Fehler...</p>
    {:else}
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Zeit</th>
              <th>Severity</th>
              <th>Message</th>
              <th>Route</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each items as item}
              <tr>
                <td>{new Date(item.timestamp).toLocaleString("de-DE")}</td>
                <td>{item.severity}</td>
                <td>{item.message}</td>
                <td>{item.route ?? "-"}</td>
                <td>{item.resolved ? "resolved" : "open"}</td>
                <td>
                  <div class="actions">
                    <button class="btn btn-outline" type="button" on:click={() => (selected = item)}>Stack</button>
                    {#if !item.resolved}
                      <button class="btn btn-outline" type="button" on:click={() => resolve(item.id)}>Resolve</button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>

  {#if selected}
    <button class="modal-backdrop" type="button" aria-label="Schließen" on:click={() => (selected = null)}></button>
    <div class="modal">
      <h3>{selected.message}</h3>
      <pre>{selected.stack ?? "Kein Stacktrace"}</pre>
      <button class="btn btn-outline" type="button" on:click={() => (selected = null)}>Schließen</button>
    </div>
  {/if}
</section>
