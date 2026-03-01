<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import { apiFetch } from "$lib/api";
  import { authHeader } from "$lib/auth";
  import { pushToast } from "$lib/toast";

  type SummaryResponse = {
    generatedAt: string;
    api: {
      requestCount: number;
      p95LatencyMs: number;
      errorRate: number;
      byRoute: Array<{ route: string; requestCount: number; p95LatencyMs: number; errorRate: number }>;
    };
    ws: { connectedClients: number; messagesPerSec: number; droppedMessages: number };
    db: { poolUsage: number; slowQueries: number; migrationStatus: string };
    queue: { throughput: number; retries: number; deadLetterCount: number };
    redis: { memoryMb: number; hitRatio: number; evictions: number };
    system: { cpuLoad1m: number; ramUsedMb: number; ramTotalMb: number; diskUsedMb: number; diskTotalMb: number; uptimeSec: number };
  };

  type Point = { ts: string; value: number };
  type TimeseriesResponse = { metric: string; range: string; points: Point[] };
  type AlertItem = {
    id: string;
    name: string;
    metric: string;
    operator: "gt" | "lt";
    threshold: number;
    window_seconds: number;
    is_active: number;
    last_triggered_at: string | null;
    last_value: number | null;
  };

  const trackedMetrics = [
    { key: "api.p95_latency_ms", label: "API p95 (ms)" },
    { key: "api.error_rate", label: "API Fehlerquote (%)" },
    { key: "ws.messages_per_sec", label: "WS msg/s" },
    { key: "db.slow_queries", label: "DB Slow Queries" },
    { key: "system.cpu_load_1m", label: "CPU Load 1m" },
    { key: "system.ram_used_mb", label: "RAM Used (MB)" }
  ];

  const investigateTarget = (metric: string) => {
    if (metric.startsWith("api.")) return "/admin?tab=api-heatmap";
    if (metric.startsWith("ws.")) return "/admin?tab=websocket";
    if (metric.startsWith("db.")) return "/admin?tab=database";
    if (metric.startsWith("queue.")) return "/admin?tab=queue";
    if (metric.startsWith("redis.")) return "/admin?tab=redis";
    return "/admin?tab=errors";
  };

  let loading = true;
  let summary: SummaryResponse | null = null;
  let series = new Map<string, Point[]>();
  let alerts: AlertItem[] = [];
  let timer: number | null = null;
  let alertModalOpen = false;
  let creatingAlert = false;
  let testingAlerts = false;
  let downloadLoading = false;

  let alertName = "";
  let alertMetric = "api.error_rate";
  let alertOperator: "gt" | "lt" = "gt";
  let alertThreshold = "5";
  let alertWindowSeconds = "300";

  const loadSummary = async () => {
    summary = await apiFetch<SummaryResponse>("/api/admin/metrics/summary");
  };

  const loadSeries = async () => {
    const requests = trackedMetrics.map(async (metric) => {
      const data = await apiFetch<TimeseriesResponse>(
        `/api/admin/metrics/timeseries?metric=${encodeURIComponent(metric.key)}&range=6h`
      );
      return { key: metric.key, points: data.points ?? [] };
    });
    const result = await Promise.all(requests);
    const map = new Map<string, Point[]>();
    for (const item of result) {
      map.set(item.key, item.points);
    }
    series = map;
  };

  const loadAlerts = async () => {
    const data = await apiFetch<{ items: AlertItem[] }>("/api/admin/alerts");
    alerts = data.items ?? [];
  };

  const loadAll = async (showToast = true) => {
    try {
      await Promise.all([loadSummary(), loadSeries(), loadAlerts()]);
    } catch (error) {
      if (showToast) {
        pushToast(error instanceof Error ? error.message : "Observability-Daten konnten nicht geladen werden.", "error");
      }
    } finally {
      loading = false;
    }
  };

  const createAlert = async () => {
    creatingAlert = true;
    try {
      await apiFetch("/api/admin/alerts", {
        method: "POST",
        body: JSON.stringify({
          name: alertName,
          metric: alertMetric,
          operator: alertOperator,
          threshold: Number(alertThreshold),
          windowSeconds: Number(alertWindowSeconds),
          isActive: true
        })
      });
      pushToast("Alert erstellt.", "success", 1000);
      alertModalOpen = false;
      alertName = "";
      await loadAlerts();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Alert konnte nicht erstellt werden.", "error");
    } finally {
      creatingAlert = false;
    }
  };

  const testAllAlerts = async () => {
    testingAlerts = true;
    try {
      const result = await apiFetch<{ results: Array<{ name: string; triggered: boolean }> }>("/api/admin/alerts/test", {
        method: "POST"
      });
      const triggered = result.results.filter((item) => item.triggered).length;
      pushToast(`Alert-Test abgeschlossen: ${triggered} ausgelöst.`, "success", 1200);
      await loadAlerts();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Alert-Test fehlgeschlagen.", "error");
    } finally {
      testingAlerts = false;
    }
  };

  const downloadReport = async (format: "json" | "csv") => {
    downloadLoading = true;
    try {
      const response = await fetch(`/api/admin/metrics/report?format=${format}`, {
        headers: authHeader()
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `pfadi-observability-report.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Download fehlgeschlagen.", "error");
    } finally {
      downloadLoading = false;
    }
  };

  const pointsToPath = (points: Point[]) => {
    if (points.length === 0) return "";
    const width = 280;
    const height = 64;
    const values = points.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    return points
      .map((point, index) => {
        const x = (index / Math.max(1, points.length - 1)) * width;
        const y = height - ((point.value - min) / span) * height;
        return `${x},${y}`;
      })
      .join(" ");
  };

  const fmtNumber = (value: number) => Number(value || 0).toFixed(2);

  onMount(() => {
    void loadAll();
    timer = window.setInterval(() => void loadAll(false), 15_000);
  });

  onDestroy(() => {
    if (timer !== null) clearInterval(timer);
  });
</script>

<section class="section-block">
  <h2 class="section-title">Observability</h2>

  <div class="actions">
    <button class="btn btn-outline" type="button" on:click={() => void loadAll()} disabled={loading}>Aktualisieren</button>
    <button class="btn btn-outline" type="button" on:click={() => void testAllAlerts()} disabled={testingAlerts}>
      {testingAlerts ? "Teste..." : "Alerts testen"}
    </button>
    <button class="btn btn-outline" type="button" on:click={() => void downloadReport("json")} disabled={downloadLoading}>
      Report JSON
    </button>
    <button class="btn btn-outline" type="button" on:click={() => void downloadReport("csv")} disabled={downloadLoading}>
      Report CSV
    </button>
    <button class="btn btn-primary" type="button" on:click={() => (alertModalOpen = true)}>Alert erstellen</button>
  </div>

  <div class="grid-3">
    <Card title="API Request Count">{summary?.api.requestCount ?? 0}</Card>
    <Card title="API p95">{fmtNumber(summary?.api.p95LatencyMs ?? 0)} ms</Card>
    <Card title="API Error Rate">{fmtNumber(summary?.api.errorRate ?? 0)} %</Card>
    <Card title="WS Clients">{summary?.ws.connectedClients ?? 0}</Card>
    <Card title="WS Msg/s">{fmtNumber(summary?.ws.messagesPerSec ?? 0)}</Card>
    <Card title="WS Dropped">{summary?.ws.droppedMessages ?? 0}</Card>
    <Card title="Queue Throughput">{fmtNumber(summary?.queue.throughput ?? 0)}/min</Card>
    <Card title="DB Slow Queries">{summary?.db.slowQueries ?? 0}</Card>
    <Card title="System CPU Load">{fmtNumber(summary?.system.cpuLoad1m ?? 0)}</Card>
  </div>

  <Card title="Timeseries">
    <div class="chart-grid">
      {#each trackedMetrics as metric}
        <div class="mini-chart">
          <div class="mini-chart__title">{metric.label}</div>
          <svg viewBox="0 0 280 64" preserveAspectRatio="none" aria-label={metric.label}>
            <polyline points={pointsToPath(series.get(metric.key) ?? [])} fill="none" stroke="var(--color-primary)" stroke-width="2" />
          </svg>
        </div>
      {/each}
    </div>
  </Card>

  <Card title="Alerts">
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Metric</th>
            <th>Threshold</th>
            <th>Letzter Trigger</th>
            <th>Investigate</th>
          </tr>
        </thead>
        <tbody>
          {#if alerts.length === 0}
            <tr>
              <td colspan="5" class="text-muted">Keine Alerts.</td>
            </tr>
          {:else}
            {#each alerts as alert}
              <tr>
                <td>{alert.name}</td>
                <td>{alert.metric}</td>
                <td>{alert.operator} {alert.threshold}</td>
                <td>{alert.last_triggered_at ? new Date(alert.last_triggered_at).toLocaleString("de-DE") : "-"}</td>
                <td><a href={investigateTarget(alert.metric)}>Öffnen</a></td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </Card>
</section>

{#if alertModalOpen}
  <button class="modal-backdrop" type="button" aria-label="Close" on:click={() => (alertModalOpen = false)}></button>
  <div class="modal">
    <h3>Neuen Alert erstellen</h3>
    <label>
      <span>Name</span>
      <input bind:value={alertName} />
    </label>
    <label>
      <span>Metric</span>
      <select bind:value={alertMetric}>
        {#each trackedMetrics as metric}
          <option value={metric.key}>{metric.key}</option>
        {/each}
        <option value="ws.dropped_messages">ws.dropped_messages</option>
        <option value="db.slow_queries">db.slow_queries</option>
        <option value="queue.dead_letter_count">queue.dead_letter_count</option>
      </select>
    </label>
    <label>
      <span>Operator</span>
      <select bind:value={alertOperator}>
        <option value="gt">größer als</option>
        <option value="lt">kleiner als</option>
      </select>
    </label>
    <label>
      <span>Threshold</span>
      <input bind:value={alertThreshold} inputmode="decimal" />
    </label>
    <label>
      <span>Fenster (Sekunden)</span>
      <input bind:value={alertWindowSeconds} inputmode="numeric" />
    </label>
    <div class="actions">
      <button class="btn btn-outline" type="button" on:click={() => (alertModalOpen = false)}>Abbrechen</button>
      <button class="btn btn-primary" type="button" on:click={() => void createAlert()} disabled={creatingAlert || !alertName.trim()}>
        {creatingAlert ? "Speichert..." : "Speichern"}
      </button>
    </div>
  </div>
{/if}

<style>
  .chart-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--space-2);
  }

  .mini-chart {
    background: var(--surface-subtle);
    border-radius: var(--radius-sm);
    padding: var(--space-1);
  }

  .mini-chart__title {
    margin-bottom: 8px;
    font-size: 12px;
    color: var(--color-text-muted);
  }

  .mini-chart svg {
    width: 100%;
    height: 64px;
  }
</style>
