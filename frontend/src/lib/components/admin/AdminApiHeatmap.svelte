<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import { apiFetch } from "$lib/api";
  import { pushToast } from "$lib/toast";
  import { adminApiMetricsStore, subscribeAdminChannel } from "$lib/admin/ws/stores";

  type HeatItem = {
    endpoint: string;
    method: string;
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
    requestsPerMinute: number;
  };

  let loading = true;
  let items: HeatItem[] = [];
  let sortKey: keyof HeatItem = "totalRequests";
  let sortDir: "asc" | "desc" = "desc";
  let unsubscribeChannel: (() => void) | null = null;
  let unsubscribeStore: (() => void) | null = null;

  const load = async () => {
    loading = true;
    try {
      const data = await apiFetch<{ items: HeatItem[] }>("/api/admin/metrics/api-heatmap");
      items = data.items ?? [];
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "API Heatmap nicht erreichbar.", "error");
    } finally {
      loading = false;
    }
  };

  const sortBy = (key: keyof HeatItem) => {
    if (sortKey === key) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
      return;
    }
    sortKey = key;
    sortDir = "desc";
  };

  const intensity = (value: number) => Math.min(1, Math.max(0, value / 200));

  $: sorted = [...items].sort((a, b) => {
    const l = a[sortKey];
    const r = b[sortKey];
    if (typeof l === "string" && typeof r === "string") {
      return sortDir === "asc" ? l.localeCompare(r) : r.localeCompare(l);
    }
    const left = Number(l ?? 0);
    const right = Number(r ?? 0);
    return sortDir === "asc" ? left - right : right - left;
  });

  onMount(() => {
    void load();
    unsubscribeChannel = subscribeAdminChannel("api-metrics");
    unsubscribeStore = adminApiMetricsStore.subscribe((payload) => {
      if (!payload) return;
      const liveItems = Array.isArray((payload as { items?: unknown[] }).items)
        ? ((payload as { items?: unknown[] }).items as HeatItem[])
        : [];
      if (liveItems.length === 0) return;
      items = liveItems;
      loading = false;
    });
  });

  onDestroy(() => {
    unsubscribeChannel?.();
    unsubscribeStore?.();
  });
</script>

<section class="section-block">
  <h2 class="section-title">API Request Heatmap</h2>
  <Card title="Endpoint Metrics">
    {#if loading}
      <p class="text-muted">Lade Heatmap...</p>
    {:else}
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th><button class="btn-link" on:click={() => sortBy("endpoint")}>Endpoint</button></th>
              <th><button class="btn-link" on:click={() => sortBy("method")}>Method</button></th>
              <th><button class="btn-link" on:click={() => sortBy("totalRequests")}>Total</button></th>
              <th><button class="btn-link" on:click={() => sortBy("avgResponseTime")}>Avg (ms)</button></th>
              <th><button class="btn-link" on:click={() => sortBy("errorRate")}>Error %</button></th>
              <th><button class="btn-link" on:click={() => sortBy("requestsPerMinute")}>RPM</button></th>
            </tr>
          </thead>
          <tbody>
            {#each sorted as item}
              <tr style={`background: rgba(0, 122, 255, ${intensity(item.totalRequests) * 0.12});`}>
                <td>{item.endpoint}</td>
                <td>{item.method}</td>
                <td>{item.totalRequests}</td>
                <td class={item.avgResponseTime > 800 ? "warn" : ""}>{item.avgResponseTime.toFixed(1)}</td>
                <td class={item.errorRate > 5 ? "error" : ""}>{item.errorRate.toFixed(2)}%</td>
                <td>{item.requestsPerMinute.toFixed(2)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>
</section>

<style>
  .btn-link {
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
    padding: 0;
  }

  .warn {
    color: #b7791f;
    font-weight: 600;
  }

  .error {
    color: #c53030;
    font-weight: 600;
  }
</style>
