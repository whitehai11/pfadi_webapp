<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { session } from "$lib/auth";
  import { get } from "svelte/store";
  import { apiFetch } from "$lib/api";
  import { pushToast } from "$lib/toast";
  import AdminHeader from "$lib/components/admin/AdminHeader.svelte";
  import AdminStats from "$lib/components/admin/AdminStats.svelte";

  type AdminStatsData = {
    totalUsers: number;
    activeSessions: number;
    totalEvents: number;
    totalChatMessages: number;
    messagesToday: number;
    serverUptime: number;
    memoryUsage: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
    appVersion: string;
    gitCommit: string;
    dockerContainerId: string | null;
  };

  let stats: AdminStatsData | null = null;
  let loading = true;
  let refreshTimer: number | null = null;
  let lastUpdatedAt = "";

  const loadStats = async (showErrorToast = true) => {
    try {
      const data = await apiFetch<AdminStatsData>("/api/admin/stats", { toastOnError: false });
      stats = data;
      lastUpdatedAt = new Date().toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch (error) {
      if (showErrorToast) {
        pushToast(error instanceof Error ? error.message : "Admin-Statistiken konnten nicht geladen werden.", "error");
      }
    } finally {
      loading = false;
    }
  };

  const startAutoRefresh = () => {
    if (refreshTimer !== null) return;
    refreshTimer = window.setInterval(() => {
      void loadStats(false);
    }, 30_000);
  };

  const stopAutoRefresh = () => {
    if (refreshTimer === null) return;
    clearInterval(refreshTimer);
    refreshTimer = null;
  };

  export const refresh = async () => {
    await loadStats();
  };

  onMount(() => {
    const current = get(session);
    if (!current || (current.role !== "admin" && current.role !== "dev")) {
      loading = false;
      return;
    }
    void loadStats();
    startAutoRefresh();
  });

  onDestroy(() => {
    stopAutoRefresh();
  });
</script>

<section class="section-block">
  <AdminHeader {lastUpdatedAt} {loading} onRefresh={() => void loadStats()} />
  <AdminStats {stats} {loading} />
</section>
