<script lang="ts">
  export let visible = false;
  export let version = "";
  export let onReload: () => void = () => {};
  export let onDismiss: () => void = () => {};
</script>

{#if visible}
  <div class="update-banner" role="status" aria-live="polite">
    <div class="update-banner__copy">
      <strong>Neue Version verfugbar</strong>
      {#if version}
        <span>Version {version} steht bereit.</span>
      {/if}
    </div>

    <div class="update-banner__actions">
      <button class="btn btn-outline" type="button" on:click={onDismiss}>Spater</button>
      <button class="btn btn-primary" type="button" on:click={onReload}>Neu laden</button>
    </div>
  </div>
{/if}
