<script lang="ts">
  export let lastUpdatedAt = "";
  export let loading = false;
  export let onRefresh: (() => void) | null = null;
</script>

<div class="dashboard-head">
  <p class="text-muted">Letzte Aktualisierung: {lastUpdatedAt || "-"}</p>
  <button class="btn btn-outline" type="button" disabled={loading} on:click={() => onRefresh?.()}>
    {loading ? "Lade..." : "Aktualisieren"}
  </button>
</div>

<style>
  .dashboard-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-1);
  }

  @media (max-width: 680px) {
    .dashboard-head {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
