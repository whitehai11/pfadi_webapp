<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import { apiFetch } from "$lib/api";
  import { pushToast } from "$lib/toast";

  type SystemMonitor = {
    cpuUsagePercent: number;
    memoryUsage: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
    uptimeSeconds: number;
    activeConnections: number;
  };

  let monitor: SystemMonitor | null = null;
  let loading = true;
  let timer: number | null = null;

  const toMb = (value: number | undefined) =>
    `${((Number(value ?? 0) || 0) / (1024 * 1024)).toFixed(1)} MB`;
  const uptime = (seconds: number | undefined) => {
    const s = Math.max(0, Math.floor(Number(seconds ?? 0)));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const load = async (toast = false) => {
    try {
      monitor = await apiFetch<SystemMonitor>("/api/admin/system");
    } catch (error) {
      if (toast) {
        pushToast(error instanceof Error ? error.message : "Systemmonitor konnte nicht geladen werden.", "error");
      }
    } finally {
      loading = false;
    }
  };

  onMount(() => {
    void load(true);
    timer = window.setInterval(() => {
      void load(false);
    }, 5000);
  });

  onDestroy(() => {
    if (timer !== null) clearInterval(timer);
  });
</script>

<section class="section-block">
  <h2 class="section-title">Live System Monitor</h2>
  <div class="grid-2">
    <Card title="CPU Usage">
      <p class="stat-value">{(monitor?.cpuUsagePercent ?? 0).toFixed(2)}%</p>
    </Card>
    <Card title="Memory Usage">
      <p class="stat-value">{toMb(monitor?.memoryUsage?.heapUsed)}</p>
    </Card>
    <Card title="Uptime">
      <p class="stat-value">{uptime(monitor?.uptimeSeconds)}</p>
    </Card>
    <Card title="Active Connections">
      <p class="stat-value">{monitor?.activeConnections ?? 0}</p>
    </Card>
  </div>
  {#if loading}
    <p class="text-muted">Lade Systemdaten...</p>
  {/if}
</section>

<style>
  .stat-value {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 600;
  }
</style>
