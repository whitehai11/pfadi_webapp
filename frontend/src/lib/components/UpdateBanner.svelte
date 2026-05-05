<script lang="ts">
  export let visible = false;
  export let version = "";
  export let onReload: () => void = () => {};
  export let onDismiss: () => void = () => {};
</script>

{#if visible}
  <div class="update-banner" role="status" aria-live="polite">
    <div class="update-banner__copy">
      <strong>Update verfügbar</strong>
      {#if version}
        <span>Version {version} ist bereit.</span>
      {/if}
    </div>
    <div class="update-banner__actions">
      <button class="btn-dismiss" type="button" on:click={onDismiss}>Später</button>
      <button class="btn-reload" type="button" on:click={onReload}>Neu laden</button>
    </div>
  </div>
{/if}

<style>
  .update-banner {
    position: fixed;
    bottom: 1.25rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1.25rem;
    background: var(--bg-card, #1e1e2e);
    border: 1px solid var(--accent, #7c6af7);
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
    white-space: nowrap;
    flex-wrap: wrap;
  }

  .update-banner__copy {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  .update-banner__copy strong {
    color: var(--accent, #7c6af7);
  }

  .update-banner__copy span {
    color: var(--text-muted, #aaa);
    font-size: 0.82rem;
  }

  .update-banner__actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-dismiss {
    background: transparent;
    border: 1px solid var(--border, #333);
    border-radius: 7px;
    color: var(--text-muted, #aaa);
    padding: 0.35rem 0.85rem;
    font-size: 0.85rem;
    cursor: pointer;
  }

  .btn-dismiss:hover {
    border-color: var(--text-muted, #aaa);
    color: var(--text, #eee);
  }

  .btn-reload {
    background: var(--accent, #7c6af7);
    border: none;
    border-radius: 7px;
    color: #fff;
    padding: 0.35rem 0.85rem;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-reload:hover {
    filter: brightness(1.15);
  }
</style>
