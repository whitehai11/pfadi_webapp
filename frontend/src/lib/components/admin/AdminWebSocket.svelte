<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import { apiFetch } from "$lib/api";
  import { pushToast } from "$lib/toast";

  type WsStatus = {
    connectedClients: number;
    chatConnections: number;
    notificationConnections: number;
    onlineUsers: number;
    messagesPerMinute: number;
    lastBroadcastAt: string | null;
    lastBroadcastEvent: string | null;
  };

  let status: WsStatus | null = null;
  let loading = true;
  let timer: number | null = null;

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }) : "-";

  const load = async (toast = false) => {
    try {
      status = await apiFetch<WsStatus>("/api/admin/websocket");
    } catch (error) {
      if (toast) {
        pushToast(error instanceof Error ? error.message : "WebSocket Monitor konnte nicht geladen werden.", "error");
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
  <h2 class="section-title">WebSocket Monitor</h2>
  <div class="grid-2">
    <Card title="Connected Clients">
      <p class="stat-value">{status?.connectedClients ?? 0}</p>
    </Card>
    <Card title="Online Users">
      <p class="stat-value">{status?.onlineUsers ?? 0}</p>
    </Card>
    <Card title="Messages / Minute">
      <p class="stat-value">{status?.messagesPerMinute ?? 0}</p>
    </Card>
    <Card title="Last Broadcast">
      <p class="stat-value">{status?.lastBroadcastEvent ?? "-"}</p>
      <p class="text-muted">{fmt(status?.lastBroadcastAt ?? null)}</p>
    </Card>
  </div>
  {#if loading}
    <p class="text-muted">Lade WebSocket-Daten...</p>
  {/if}
</section>

<style>
  .stat-value {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 600;
  }
</style>
