<script lang="ts">
  import Icon from "$lib/components/Icon.svelte";

  export let title = "";
  export let subtitle = "";
  export let first = false;
  export let last = false;
  export let disabled = false;
</script>

<button
  type="button"
  class:first
  class:last
  class:disabled
  class="settings-row"
  on:click
  disabled={disabled}
>
  <span class="settings-row__copy">
    <span class="settings-row__title">{title}</span>
    {#if subtitle}
      <span class="settings-row__subtitle">{subtitle}</span>
    {/if}
  </span>
  <span class="settings-row__chevron" aria-hidden="true">
    <Icon name="chevron" size={15} />
  </span>
</button>

<style>
  .settings-row {
    width: 100%;
    padding: 1rem 1.15rem;
    border: 0;
    border-top: 1px solid rgba(29, 29, 31, 0.08);
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    cursor: pointer;
    text-align: left;
    transition: background 150ms ease;
  }

  .settings-row.first {
    border-top: 0;
  }

  .settings-row:hover,
  .settings-row:focus-visible {
    background: rgba(0, 122, 255, 0.04);
    outline: none;
  }

  .settings-row.disabled {
    cursor: default;
    opacity: 0.6;
  }

  .settings-row__copy {
    display: grid;
    gap: 0.2rem;
  }

  .settings-row__title {
    font-size: 0.96rem;
    font-weight: 600;
    color: #1d1d1f;
  }

  .settings-row__subtitle {
    font-size: 0.84rem;
    color: #6e6e73;
    line-height: 1.4;
  }

  .settings-row__chevron {
    color: #8e8e93;
    flex-shrink: 0;
  }
</style>
