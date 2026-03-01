<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import Card from "$lib/components/Card.svelte";
  import { apiFetch } from "$lib/api";
  import { session } from "$lib/auth";
  import { pushToast } from "$lib/toast";
  import { get } from "svelte/store";
  import AdminHeader from "$lib/components/admin/AdminHeader.svelte";
  import AdminStats from "$lib/components/admin/AdminStats.svelte";
  import AdminUserManagement from "$lib/components/admin/AdminUserManagement.svelte";
  import AdminSystemTools from "$lib/components/admin/AdminSystemTools.svelte";
  import AdminSidebar, { type AdminTabId, type AdminTabItem } from "$lib/components/admin/AdminSidebar.svelte";
  import AdminTopBar from "$lib/components/admin/AdminTopBar.svelte";
  import AdminOverview from "$lib/components/admin/AdminOverview.svelte";
  import AdminObservability from "$lib/components/admin/AdminObservability.svelte";
  import AdminSystemMonitor from "$lib/components/admin/AdminSystemMonitor.svelte";
  import AdminJobs from "$lib/components/admin/AdminJobs.svelte";
  import AdminDocker from "$lib/components/admin/AdminDocker.svelte";
  import AdminWebSocket from "$lib/components/admin/AdminWebSocket.svelte";
  import AdminFeatureFlags from "$lib/components/admin/AdminFeatureFlags.svelte";
  import AdminDatabaseHealth from "$lib/components/admin/AdminDatabaseHealth.svelte";
  import AdminAuditLogs from "$lib/components/admin/AdminAuditLogs.svelte";
  import AdminLogStream from "$lib/components/admin/AdminLogStream.svelte";
  import AdminQueueMonitor from "$lib/components/admin/AdminQueueMonitor.svelte";
  import AdminRedisMonitor from "$lib/components/admin/AdminRedisMonitor.svelte";
  import AdminSecurityPanel from "$lib/components/admin/AdminSecurityPanel.svelte";
  import AdminErrorTracking from "$lib/components/admin/AdminErrorTracking.svelte";
  import AdminApiHeatmap from "$lib/components/admin/AdminApiHeatmap.svelte";

  type AdminStats = { totalUsers: number };

  let activeTab: AdminTabId = "overview";
  const tabs: AdminTabItem[] = [
    { id: "overview", label: "Overview" },
    { id: "observability", label: "Observability" },
    { id: "users", label: "Users" },
    { id: "system-monitor", label: "System Monitor" },
    { id: "jobs", label: "Jobs" },
    { id: "docker", label: "Docker" },
    { id: "websocket", label: "WebSocket" },
    { id: "feature-flags", label: "Feature Flags" },
    { id: "database", label: "Database" },
    { id: "audit-logs", label: "Audit Logs" },
    { id: "log-stream", label: "Log Stream" },
    { id: "queue", label: "Queue" },
    { id: "redis", label: "Redis" },
    { id: "security", label: "Security" },
    { id: "errors", label: "Errors" },
    { id: "api-heatmap", label: "API Heatmap" }
  ];

  const tabTitles: Record<AdminTabId, string> = {
    overview: "Overview",
    observability: "Observability",
    users: "Users",
    "system-monitor": "System Monitor",
    jobs: "Background Jobs",
    docker: "Docker",
    websocket: "WebSocket",
    "feature-flags": "Feature Flags",
    database: "Database Health",
    "audit-logs": "Audit Logs",
    "log-stream": "Log Stream",
    queue: "Queue Monitor",
    redis: "Redis Monitor",
    security: "Security Audit",
    errors: "Error Tracking",
    "api-heatmap": "API Heatmap"
  };

  const normalizeTab = (value: string | null): AdminTabId => {
    const candidate = String(value ?? "").trim() as AdminTabId;
    return tabs.some((tab) => tab.id === candidate) ? candidate : "overview";
  };

  const setTab = async (tab: AdminTabId) => {
    activeTab = tab;
    const params = new URLSearchParams($page.url.searchParams);
    params.set("tab", tab);
    await goto(`${$page.url.pathname}?${params.toString()}`, {
      replaceState: true,
      noScroll: true,
      keepFocus: true
    });
  };

  onMount(() => {
    activeTab = normalizeTab($page.url.searchParams.get("tab"));
  });

  onDestroy(() => {});

  $: if ($page.url.searchParams.get("tab") !== activeTab) {
    activeTab = normalizeTab($page.url.searchParams.get("tab"));
  }
</script>

<div class="page-stack">
  <section class="page-intro">
    <h1 class="page-title">Admin Dashboard</h1>
  </section>

  {#if !$session || $session.role !== "admin"}
    <Card title="Kein Zugriff">
      <p class="text-muted">Admin-Berechtigung erforderlich.</p>
    </Card>
  {:else}
    <div class="admin-layout">
      <AdminSidebar {tabs} {activeTab} onSelect={(tab) => void setTab(tab)} />

      <section class="admin-content">
        <AdminTopBar
          title={tabTitles[activeTab]}
          subtitle="Admin Control Center"
          onRefresh={() => void setTab(activeTab)}
        />

        {#if activeTab === "overview"}
          <div in:fade={{ duration: 150 }}>
            <AdminOverview />
          </div>
        {:else if activeTab === "observability"}
          <div in:fade={{ duration: 150 }}>
            <AdminObservability />
          </div>
        {:else if activeTab === "users"}
          <div in:fade={{ duration: 150 }}>
            <AdminUserManagement />
          </div>
        {:else if activeTab === "system-monitor"}
          <div in:fade={{ duration: 150 }}>
            <AdminSystemMonitor />
          </div>
        {:else if activeTab === "jobs"}
          <div in:fade={{ duration: 150 }}>
            <AdminJobs />
          </div>
        {:else if activeTab === "docker"}
          <div in:fade={{ duration: 150 }}>
            <AdminDocker />
          </div>
        {:else if activeTab === "websocket"}
          <div in:fade={{ duration: 150 }}>
            <AdminWebSocket />
          </div>
        {:else if activeTab === "feature-flags"}
          <div in:fade={{ duration: 150 }}>
            <AdminFeatureFlags />
          </div>
        {:else if activeTab === "database"}
          <div in:fade={{ duration: 150 }}>
            <AdminDatabaseHealth />
          </div>
        {:else if activeTab === "audit-logs"}
          <div in:fade={{ duration: 150 }}>
            <AdminAuditLogs />
          </div>
        {:else if activeTab === "log-stream"}
          <div in:fade={{ duration: 150 }}>
            <AdminLogStream />
          </div>
        {:else if activeTab === "queue"}
          <div in:fade={{ duration: 150 }}>
            <AdminQueueMonitor />
          </div>
        {:else if activeTab === "redis"}
          <div in:fade={{ duration: 150 }}>
            <AdminRedisMonitor />
          </div>
        {:else if activeTab === "security"}
          <div in:fade={{ duration: 150 }}>
            <AdminSecurityPanel />
          </div>
        {:else if activeTab === "errors"}
          <div in:fade={{ duration: 150 }}>
            <AdminErrorTracking />
          </div>
        {:else if activeTab === "api-heatmap"}
          <div in:fade={{ duration: 150 }}>
            <AdminApiHeatmap />
          </div>
        {/if}
      </section>
    </div>
  {/if}
</div>

<style>
  .admin-layout {
    display: grid;
    gap: var(--space-2);
    grid-template-columns: 240px minmax(0, 1fr);
    align-items: start;
  }

  .admin-content {
    display: grid;
    gap: var(--space-2);
  }

  @media (max-width: 980px) {
    .admin-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
