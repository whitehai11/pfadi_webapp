<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import { apiFetch } from "$lib/api";
  import { pushToast } from "$lib/toast";
  import { adminRedisStore, subscribeAdminChannel } from "$lib/admin/ws/stores";

  type RedisStats = {
    connected: boolean;
    configured: boolean;
    memoryUsage: number | null;
    keyCount: number | null;
    uptimeSeconds: number | null;
    connectedClients: number | null;
    slowlogCount: number | null;
    message: string;
  };

  let stats: RedisStats | null = null;
  let loading = true;
  let unsubscribeChannel: (() => void) | null = null;
  let unsubscribeStore: (() => void) | null = null;

  const normalizeRedisStats = (payload: Record<string, unknown>) => {
    const source = (payload.status ?? payload) as Record<string, unknown>;
    return {
      connected: Boolean(source.connected),
      configured: Boolean(source.configured),
      memoryUsage: source.memoryUsage === null ? null : Number(source.memoryUsage ?? 0),
      keyCount: source.keyCount === null ? null : Number(source.keyCount ?? 0),
      uptimeSeconds: source.uptimeSeconds === null ? null : Number(source.uptimeSeconds ?? 0),
      connectedClients: source.connectedClients === null ? null : Number(source.connectedClients ?? 0),
      slowlogCount: source.slowlogCount === null ? null : Number(source.slowlogCount ?? 0),
      message: String(source.message ?? "")
    } as RedisStats;
  };

  const load = async (toast = false) => {
    try {
      stats = await apiFetch<RedisStats>("/api/admin/redis");
    } catch (error) {
      if (toast) pushToast(error instanceof Error ? error.message : "Redis Monitor nicht erreichbar.", "error");
    } finally {
      loading = false;
    }
  };

  onMount(() => {
    void load(true);
    unsubscribeChannel = subscribeAdminChannel("redis");
    unsubscribeStore = adminRedisStore.subscribe((payload) => {
      if (!payload) return;
      stats = normalizeRedisStats(payload);
      loading = false;
    });
  });

  onDestroy(() => {
    unsubscribeChannel?.();
    unsubscribeStore?.();
  });
</script>

<section class="section-block">
  <h2 class="section-title">Redis Monitor</h2>
  <div class="grid-3">
    <Card title="Health">{stats?.connected ? "Connected" : "Disconnected"}</Card>
    <Card title="Configured">{stats?.configured ? "Yes" : "No"}</Card>
    <Card title="Clients">{stats?.connectedClients ?? "-"}</Card>
    <Card title="Memory">{stats?.memoryUsage ?? "-"}</Card>
    <Card title="Keys">{stats?.keyCount ?? "-"}</Card>
    <Card title="Slowlog">{stats?.slowlogCount ?? "-"}</Card>
  </div>
  {#if loading}
    <p class="text-muted">Lade Redis-Daten...</p>
  {/if}
  {#if stats?.message}
    <p class="text-muted">{stats.message}</p>
  {/if}
</section>
