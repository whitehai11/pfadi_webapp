<script lang="ts">
  import Card from "$lib/components/Card.svelte";

  type AdminStats = {
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

  export let stats: AdminStats | null = null;
  export let loading = false;

  const formatNumber = (value: number | undefined) =>
    new Intl.NumberFormat("de-DE").format(Number.isFinite(Number(value)) ? Number(value) : 0);

  const formatUptime = (seconds: number | undefined) => {
    const safe = Number.isFinite(Number(seconds)) ? Math.max(0, Number(seconds)) : 0;
    const days = Math.floor(safe / 86400);
    const hours = Math.floor((safe % 86400) / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const bytesToMb = (bytes: number | undefined) => {
    const safe = Number.isFinite(Number(bytes)) ? Math.max(0, Number(bytes)) : 0;
    return `${(safe / (1024 * 1024)).toFixed(1)} MB`;
  };
</script>

<section class="section-block">
  <h2 class="section-title">System Overview</h2>

  {#if loading}
    <div class="stats-grid">
      {#each Array(8) as _, i (i)}
        <Card title="Lade...">
          <div class="skeleton-value"></div>
          <div class="skeleton-sub"></div>
        </Card>
      {/each}
    </div>
  {:else}
    <div class="stats-grid">
      <Card title="Total Users">
        <p class="stat-value">{formatNumber(stats?.totalUsers)}</p>
      </Card>

      <Card title="Active Sessions">
        <p class="stat-value">{formatNumber(stats?.activeSessions)}</p>
      </Card>

      <Card title="Events">
        <p class="stat-value">{formatNumber(stats?.totalEvents)}</p>
      </Card>

      <Card title="Chat Messages Today">
        <p class="stat-value">{formatNumber(stats?.messagesToday)}</p>
      </Card>

      <Card title="Server Uptime">
        <p class="stat-value">{formatUptime(stats?.serverUptime)}</p>
      </Card>

      <Card title="Memory Usage">
        <p class="stat-value">{bytesToMb(stats?.memoryUsage?.heapUsed)}</p>
        <p class="text-muted">Heap Used</p>
      </Card>

      <Card title="App Version">
        <p class="stat-value">{stats?.appVersion || "dev"}</p>
        <p class="text-muted">Commit: {stats?.gitCommit || "dev"}</p>
      </Card>

      <Card title="Total Chat Messages">
        <p class="stat-value">{formatNumber(stats?.totalChatMessages)}</p>
      </Card>
    </div>
  {/if}
</section>

<style>
  .stats-grid {
    display: grid;
    gap: var(--space-2);
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .stat-value {
    margin: 0;
    font-size: 1.5rem;
    line-height: 1.1;
    font-weight: 600;
    color: var(--color-text);
  }

  .skeleton-value {
    height: 1.5rem;
    width: 60%;
    border-radius: 8px;
    background: linear-gradient(90deg, var(--surface-subtle), var(--surface-muted), var(--surface-subtle));
    background-size: 200% 100%;
    animation: shimmer 1.2s infinite linear;
  }

  .skeleton-sub {
    margin-top: 0.75rem;
    height: 0.75rem;
    width: 40%;
    border-radius: 8px;
    background: linear-gradient(90deg, var(--surface-subtle), var(--surface-muted), var(--surface-subtle));
    background-size: 200% 100%;
    animation: shimmer 1.2s infinite linear;
  }

  @keyframes shimmer {
    0% {
      background-position: 0% 0%;
    }
    100% {
      background-position: -200% 0%;
    }
  }

  @media (max-width: 1080px) {
    .stats-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 680px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
