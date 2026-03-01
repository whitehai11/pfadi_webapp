<script lang="ts">
  export type AdminTabId =
    | "overview"
    | "observability"
    | "users"
    | "system-monitor"
    | "jobs"
    | "docker"
    | "websocket"
    | "feature-flags"
    | "database"
    | "audit-logs"
    | "log-stream"
    | "queue"
    | "redis"
    | "security"
    | "errors"
    | "api-heatmap";

  export type AdminTabItem = {
    id: AdminTabId;
    label: string;
  };

  export let tabs: AdminTabItem[] = [];
  export let activeTab: AdminTabId = "overview";
  export let onSelect: ((id: AdminTabId) => void) | null = null;
</script>

<aside class="admin-sidebar">
  <nav class="admin-sidebar__nav" aria-label="Admin Navigation">
    {#each tabs as tab}
      <button
        type="button"
        class={`admin-sidebar__item ${activeTab === tab.id ? "is-active" : ""}`}
        on:click={() => onSelect?.(tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </nav>
</aside>

<style>
  .admin-sidebar {
    width: 240px;
    min-width: 240px;
  }

  .admin-sidebar__nav {
    display: grid;
    gap: 6px;
    position: sticky;
    top: calc(var(--space-2) + 56px);
  }

  .admin-sidebar__item {
    height: 44px;
    border-radius: var(--radius-sm);
    border: none;
    background: var(--surface-card);
    color: var(--color-text);
    text-align: left;
    padding: 0 var(--space-1);
    cursor: pointer;
  }

  .admin-sidebar__item.is-active {
    background: var(--color-primary-soft);
    color: var(--color-primary);
    font-weight: 600;
  }

  @media (max-width: 980px) {
    .admin-sidebar {
      width: 100%;
      min-width: 0;
    }

    .admin-sidebar__nav {
      position: static;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-1);
    }
  }

  @media (max-width: 680px) {
    .admin-sidebar__nav {
      grid-template-columns: 1fr;
    }
  }
</style>
