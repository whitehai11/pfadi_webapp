<script lang="ts">
  import { onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import { apiFetch } from "$lib/api";
  import { pushToast } from "$lib/toast";

  type SecurityAuditItem = {
    id: string;
    user: string | null;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    ip_address: string | null;
    user_agent: string | null;
    timestamp: string;
    metadata: Record<string, unknown> | null;
  };

  type SecurityResponse = {
    page: number;
    pageSize: number;
    total: number;
    items: SecurityAuditItem[];
  };

  let user = "";
  let action = "";
  let dateFrom = "";
  let dateTo = "";
  let page = 1;
  let pageSize = 20;
  let total = 0;
  let items: SecurityAuditItem[] = [];
  let loading = true;
  let expandedId = "";

  const pages = () => Math.max(1, Math.ceil(total / pageSize));

  const query = () => {
    const q = new URLSearchParams();
    q.set("page", String(page));
    q.set("pageSize", String(pageSize));
    if (user.trim()) q.set("user", user.trim());
    if (action.trim()) q.set("action", action.trim());
    if (dateFrom) q.set("dateFrom", new Date(dateFrom).toISOString());
    if (dateTo) q.set("dateTo", new Date(dateTo).toISOString());
    return q.toString();
  };

  const load = async () => {
    loading = true;
    try {
      const data = await apiFetch<SecurityResponse>(`/api/admin/security/audit?${query()}`);
      items = data.items ?? [];
      total = data.total ?? 0;
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Security Audit konnte nicht geladen werden.", "error");
    } finally {
      loading = false;
    }
  };

  const apply = async () => {
    page = 1;
    await load();
  };

  const fmt = (iso: string) => new Date(iso).toLocaleString("de-DE");

  onMount(() => {
    void load();
  });
</script>

<section class="section-block">
  <h2 class="section-title">Security Audit Panel</h2>
  <Card title="Filter">
    <div class="form-grid grid-2">
      <label><span>User</span><input class="input" bind:value={user} /></label>
      <label><span>Action</span><input class="input" bind:value={action} /></label>
      <label><span>Von</span><input class="input" type="date" bind:value={dateFrom} /></label>
      <label><span>Bis</span><input class="input" type="date" bind:value={dateTo} /></label>
    </div>
    <div class="actions">
      <button class="btn btn-outline" type="button" on:click={() => void apply()}>Filter anwenden</button>
    </div>
  </Card>

  <Card title="Audit Entries">
    {#if loading}
      <p class="text-muted">Lade Einträge...</p>
    {:else}
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Zeit</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>IP</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each items as item}
              <tr>
                <td>{fmt(item.timestamp)}</td>
                <td>{item.user ?? "-"}</td>
                <td>{item.action}</td>
                <td>{item.entity_type ?? "-"} {item.entity_id ?? ""}</td>
                <td>{item.ip_address ?? "-"}</td>
                <td>
                  <button class="btn btn-outline" type="button" on:click={() => (expandedId = expandedId === item.id ? "" : item.id)}>
                    Details
                  </button>
                </td>
              </tr>
              {#if expandedId === item.id}
                <tr>
                  <td colspan="6">
                    <div class="text-muted">UA: {item.user_agent ?? "-"}</div>
                    <pre>{JSON.stringify(item.metadata ?? {}, null, 2)}</pre>
                  </td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </table>
      </div>
      <div class="actions">
        <button class="btn btn-outline" type="button" disabled={page <= 1} on:click={() => { page -= 1; void load(); }}>Zurück</button>
        <span class="text-muted">Seite {page} / {pages()}</span>
        <button class="btn btn-outline" type="button" disabled={page >= pages()} on:click={() => { page += 1; void load(); }}>Weiter</button>
      </div>
    {/if}
  </Card>
</section>
