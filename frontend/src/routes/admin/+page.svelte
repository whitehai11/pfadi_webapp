<script lang="ts">
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import Card from "$lib/components/Card.svelte";
  import { session } from "$lib/auth";
  import AdminUserManagement from "$lib/components/admin/AdminUserManagement.svelte";
  import AdminSystemTools from "$lib/components/admin/AdminSystemTools.svelte";
  import AdminSidebar, { type AdminTabId, type AdminTabItem, type AdminTabSection } from "$lib/components/admin/AdminSidebar.svelte";
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
  import AdminPushManagement from "$lib/components/admin/AdminPushManagement.svelte";
  import AdminGroupManagement from "$lib/components/admin/AdminGroupManagement.svelte";
  import AdminMatrixUsers from "$lib/components/admin/AdminMatrixUsers.svelte";
  import HeroCard from "$lib/components/heroui/HeroCard.svelte";
  import HeroButton from "$lib/components/heroui/HeroButton.svelte";

  type SessionRole = "admin" | "dev" | "user" | "materialwart";

  let activeTab: AdminTabId = "overview";
  let sections: AdminTabSection[] = [];
  let tabIndex = new Map<AdminTabId, AdminTabItem>();

  const tabTitles: Record<AdminTabId, string> = {
    overview: "Übersicht",
    users: "Benutzerverwaltung",
    push: "Push-Verwaltung",
    groups: "Gruppen",
    matrix: "Matrix-User",
    settings: "Basis-Einstellungen",
    observability: "Observability",
    "system-monitor": "Systemstatus",
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

  const adminSections: AdminTabSection[] = [
    {
      label: "Administration",
      tabs: [
        { id: "overview", label: "Übersicht" },
        { id: "users", label: "Benutzer" },
        { id: "groups", label: "Gruppen" },
        { id: "push", label: "Push" },
        { id: "matrix", label: "Matrix" },
        { id: "settings", label: "Einstellungen" }
      ]
    }
  ];

  const devSections: AdminTabSection[] = [
    ...adminSections,
    {
      label: "Observability",
      tabs: [
        { id: "observability", label: "Monitoring" },
        { id: "system-monitor", label: "Systemstatus" },
        { id: "log-stream", label: "Logs" },
        { id: "websocket", label: "WebSocket" },
        { id: "database", label: "Migrationen/DB" },
        { id: "feature-flags", label: "Feature Flags" },
        { id: "errors", label: "Errors" },
        { id: "api-heatmap", label: "API Heatmap" }
      ]
    },
    {
      label: "Infra",
      tabs: [
        { id: "jobs", label: "Jobs" },
        { id: "queue", label: "Queue" },
        { id: "docker", label: "Docker" },
        { id: "redis", label: "Redis" },
        { id: "security", label: "Security Audit" },
        { id: "audit-logs", label: "Audit Logs" }
      ]
    }
  ];

  const getSectionsByRole = (role: SessionRole | undefined | null) => {
    if (role === "dev") return devSections;
    return adminSections;
  };

  const normalizeTab = (value: string | null): AdminTabId => {
    const candidate = String(value ?? "").trim() as AdminTabId;
    return tabIndex.has(candidate) ? candidate : "overview";
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
    sections = getSectionsByRole($session?.role as SessionRole | undefined);
    tabIndex = new Map(sections.flatMap((section) => section.tabs).map((tab) => [tab.id, tab]));
    activeTab = normalizeTab($page.url.searchParams.get("tab"));
  });

  $: if ($page.url.searchParams.get("tab") !== activeTab) {
    activeTab = normalizeTab($page.url.searchParams.get("tab"));
  }

  $: sections = getSectionsByRole($session?.role as SessionRole | undefined);
  $: tabIndex = new Map(sections.flatMap((section) => section.tabs).map((tab) => [tab.id, tab]));
  $: if (!tabIndex.has(activeTab)) {
    activeTab = "overview";
  }
</script>

<div class="page-stack">
  <section class="page-intro">
    <h1 class="page-title">Admin Dashboard</h1>
  </section>

  {#if !$session || ($session.role !== "admin" && $session.role !== "dev")}
    <Card title="Kein Zugriff">
      <p class="text-muted">Admin-Berechtigung erforderlich.</p>
    </Card>
  {:else}
    <div class="admin-layout">
      <AdminSidebar {sections} {activeTab} onSelect={(tab) => void setTab(tab)} />

      <section class="admin-content">
        <HeroCard title={tabTitles[activeTab]} subtitle={$session.role === "dev" ? "DEV Ansicht" : "ADMIN Ansicht"}>
          <div class="actions">
            <HeroButton tone="neutral" onClick={() => void setTab(activeTab)}>Aktualisieren</HeroButton>
          </div>
        </HeroCard>

        {#if activeTab === "overview"}
          <div in:fade={{ duration: 150 }}>
            <AdminOverview />
          </div>
        {:else if activeTab === "push"}
          <div in:fade={{ duration: 150 }}>
            <AdminPushManagement />
          </div>
        {:else if activeTab === "groups"}
          <div in:fade={{ duration: 150 }}>
            <AdminGroupManagement />
          </div>
        {:else if activeTab === "settings"}
          <div in:fade={{ duration: 150 }}>
            <AdminSystemTools />
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
        {:else if activeTab === "matrix"}
          <div in:fade={{ duration: 150 }}>
            <AdminMatrixUsers />
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
