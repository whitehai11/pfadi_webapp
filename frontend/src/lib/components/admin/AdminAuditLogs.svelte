<script lang="ts">
  import { onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import { apiFetch } from "$lib/api";
  import { pushToast } from "$lib/toast";

  type AuditItem = {
    id: string;
    user: string | null;
    action: string;
    target_type: string | null;
    target_id: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  };

  type AuditResponse = {
    page: number;
    pageSize: number;
    total: number;
    items: AuditItem[];
  };

  let loading = true;
  let exporting = false;
  let page = 1;
  let pageSize = 20;
  let total = 0;
  let items: AuditItem[] = [];
  let user = "";
  let action = "";
  let search = "";
  let dateFrom = "";
  let dateTo = "";

  const pages = () => Math.max(1, Math.ceil(total / pageSize));
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (user.trim()) params.set("user", user.trim());
    if (action.trim()) params.set("action", action.trim());
    if (search.trim()) params.set("search", search.trim());
    if (dateFrom) params.set("dateFrom", new Date(dateFrom).toISOString());
    if (dateTo) params.set("dateTo", new Date(dateTo).toISOString());
    return params.toString();
  };

  const load = async () => {
    loading = true;
    try {
      const data = await apiFetch<AuditResponse>(`/api/admin/audit-logs?${buildQuery()}`);
      items = data.items ?? [];
      total = data.total ?? 0;
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Audit Logs konnten nicht geladen werden.", "error");
    } finally {
      loading = false;
    }
  };

  const applyFilter = async () => {
    page = 1;
    await load();
  };

  const exportJson = async () => {
    if (exporting) return;
    exporting = true;
    try {
      const query = new URLSearchParams();
      query.set("page", "1");
      query.set("pageSize", "100");
      if (user.trim()) query.set("user", user.trim());
      if (action.trim()) query.set("action", action.trim());
      if (search.trim()) query.set("search", search.trim());
      if (dateFrom) query.set("dateFrom", new Date(dateFrom).toISOString());
      if (dateTo) query.set("dateTo", new Date(dateTo).toISOString());
      const data = await apiFetch<AuditResponse>(`/api/admin/audit-logs?${query.toString()}`);
      const blob = new Blob([JSON.stringify(data.items ?? [], null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Export fehlgeschlagen.", "error");
    } finally {
      exporting = false;
    }
  };

  onMount(() => {
    void load();
  });
</script>

<section class="section-block">
  <h2 class="section-title">Audit Log Viewer</h2>
  <Card title="Filter">
    <div class="form-grid grid-3">
      <label>
        <span>User</span>
        <input class="input" bind:value={user} placeholder="z. B. admin@" />
      </label>
      <label>
        <span>Action</span>
        <input class="input" bind:value={action} placeholder="z. B. admin.user" />
      </label>
      <label>
        <span>Search</span>
        <input class="input" bind:value={search} placeholder="Metadata durchsuchen" />
      </label>
      <label>
        <span>Von</span>
        <input class="input" type="date" bind:value={dateFrom} />
      </label>
      <label>
        <span>Bis</span>
        <input class="input" type="date" bind:value={dateTo} />
      </label>
    </div>
    <div class="actions">
      <button class="btn btn-outline" type="button" on:click={() => void applyFilter()}>Filter anwenden</button>
      <button class="btn btn-primary" type="button" disabled={exporting} on:click={() => void exportJson()}>
        {exporting ? "Export..." : "Export JSON"}
      </button>
    </div>
  </Card>

  <Card title="Audit Logs">
    {#if loading}
      <p class="text-muted">Lade Logs...</p>
    {:else if items.length === 0}
      <p class="text-muted">Keine Einträge.</p>
    {:else}
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Zeit</th>
              <th>User</th>
              <th>Action</th>
              <th>Target</th>
            </tr>
          </thead>
          <tbody>
            {#each items as item}
              <tr>
                <td>{fmt(item.created_at)}</td>
                <td>{item.user ?? "-"}</td>
                <td>{item.action}</td>
                <td>{item.target_type ?? "-"} {item.target_id ?? ""}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="actions">
        <button class="btn btn-outline" type="button" disabled={page <= 1} on:click={() => { page -= 1; void load(); }}>
          Zurück
        </button>
        <span class="text-muted">Seite {page} / {pages()}</span>
        <button class="btn btn-outline" type="button" disabled={page >= pages()} on:click={() => { page += 1; void load(); }}>
          Weiter
        </button>
      </div>
    {/if}
  </Card>
</section>
