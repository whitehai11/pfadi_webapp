<script lang="ts">
  import { onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import { apiFetch } from "$lib/api";
  import { pushToast } from "$lib/toast";

  type DbHealth = {
    status: string;
    activeConnections: number;
    dbSizeBytes: number;
    slowQueryCount: number;
    migrationVersion: string;
  };

  let health: DbHealth | null = null;
  let loading = true;

  const toMb = (bytes: number | undefined) =>
    `${(((Number(bytes ?? 0) || 0) / (1024 * 1024)).toFixed(2))} MB`;

  const load = async () => {
    loading = true;
    try {
      health = await apiFetch<DbHealth>("/api/admin/db-health");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "DB-Health konnte nicht geladen werden.", "error");
    } finally {
      loading = false;
    }
  };

  onMount(() => {
    void load();
  });
</script>

<section class="section-block">
  <h2 class="section-title">Database Health</h2>
  <div class="grid-2">
    <Card title="Connection Status">
      <p class="stat-value">{health?.status ?? "-"}</p>
    </Card>
    <Card title="Active Connections">
      <p class="stat-value">{health?.activeConnections ?? 0}</p>
    </Card>
    <Card title="DB Size">
      <p class="stat-value">{toMb(health?.dbSizeBytes)}</p>
    </Card>
    <Card title="Slow Query Count">
      <p class="stat-value">{health?.slowQueryCount ?? 0}</p>
    </Card>
    <Card title="Migration Version">
      <p class="stat-value">{health?.migrationVersion ?? "-"}</p>
    </Card>
  </div>
  {#if loading}
    <p class="text-muted">Lade DB-Health...</p>
  {/if}
</section>

<style>
  .stat-value {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 600;
  }
</style>
