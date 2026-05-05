<script lang="ts">
  export type AdminTabId =
    | "overview"
    | "users"
    | "push"
    | "groups"
    | "settings"
    | "observability"
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
    | "api-heatmap"
    | "matrix";

  export type AdminTabItem = {
    id: AdminTabId;
    label: string;
  };

  export type AdminTabSection = {
    label: string;
    tabs: AdminTabItem[];
  };

  export let sections: AdminTabSection[] = [];
  export let activeTab: AdminTabId = "overview";
  export let onSelect: ((id: AdminTabId) => void) | null = null;
</script>

<aside class="admin-sidebar">
  <nav class="admin-sidebar__nav" aria-label="Admin Navigation">
    {#each sections as section}
      <section class="admin-sidebar__section">
        <p class="admin-sidebar__heading">{section.label}</p>
        {#each section.tabs as tab}
          <button
            type="button"
            class={`admin-sidebar__item ${activeTab === tab.id ? "is-active" : ""}`}
            on:click={() => onSelect?.(tab.id)}
          >
            {tab.label}
          </button>
        {/each}
      </section>
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
    gap: var(--space-2);
    position: sticky;
    top: calc(var(--space-2) + 56px);
  }

  .admin-sidebar__section {
    display: grid;
    gap: 6px;
    padding: var(--space-1);
    border-radius: var(--radius-md);
    background: var(--surface-panel);
    backdrop-filter: blur(16px) saturate(128%);
    box-shadow: var(--shadow-elev);
    border: 1px solid var(--border-card);
  }

  .admin-sidebar__heading {
    margin: 0;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-secondary);
  }

  .admin-sidebar__item {
    height: 46px;
    border-radius: var(--radius-sm);
    border: none;
    background: var(--surface-subtle);
    color: var(--text);
    text-align: left;
    padding: 0 var(--space-1);
    cursor: pointer;
  }

  .admin-sidebar__item.is-active {
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 600;
  }

  @media (max-width: 980px) {
    .admin-sidebar {
      width: 100%;
      min-width: 0;
    }

    .admin-sidebar__nav {
      position: static;
      gap: var(--space-1);
    }
  }

  @media (max-width: 680px) {
    .admin-sidebar__heading {
      font-size: 10px;
    }
  }
</style>
