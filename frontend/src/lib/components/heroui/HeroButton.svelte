<script lang="ts">
  export let type: "button" | "submit" = "button";
  export let tone: "primary" | "neutral" = "neutral";
  export let disabled = false;
  export let onClick: (() => void) | null = null;
</script>

<button class={`hero-btn hero-btn--${tone}`} {type} {disabled} on:click={() => onClick?.()}>
  <slot />
</button>

<style>
  .hero-btn {
    min-height: 44px;
    border: none;
    border-radius: 12px;
    padding: 0 14px;
    font: inherit;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .hero-btn--neutral {
    color: var(--text);
    background: var(--surface-subtle);
    box-shadow: inset 0 0 0 1px var(--border-soft);
  }

  .hero-btn--primary {
    color: var(--text-on-primary);
    background: var(--accent);
  }

  .hero-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .hero-btn:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 24px color-mix(in srgb, var(--accent) 22%, transparent);
  }
</style>
