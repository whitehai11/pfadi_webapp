<script lang="ts">
  export let title = "Admin";
  export let subtitle = "";
  export let onRefresh: (() => void) | null = null;
</script>

<header class="admin-topbar">
  <div>
    <h2 class="section-title">{title}</h2>
    {#if subtitle}
      <p class="text-muted">{subtitle}</p>
    {/if}
  </div>
  <button class="btn btn-outline" type="button" on:click={() => onRefresh?.()}>
    Aktualisieren
  </button>
</header>

<style>
  .admin-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  @media (max-width: 680px) {
    .admin-topbar {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
