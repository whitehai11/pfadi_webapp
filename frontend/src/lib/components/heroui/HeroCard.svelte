<script lang="ts">
  export let title = "";
  export let subtitle = "";
</script>

<section class="hero-card glass-surface">
  {#if title}
    <header class="hero-card__header">
      <h3>{title}</h3>
      {#if subtitle}
        <p>{subtitle}</p>
      {/if}
    </header>
  {/if}
  <div class="hero-card__content">
    <slot />
  </div>
</section>

<style>
  .hero-card {
    border-radius: 16px;
    padding: var(--space-2);
    background: var(--surface-panel);
    backdrop-filter: blur(18px) saturate(130%);
    box-shadow: var(--shadow-elev);
    border: 1px solid var(--border-card);
  }

  .hero-card__header {
    margin-bottom: var(--space-1);
  }

  .hero-card__header h3 {
    margin: 0;
    font-size: 15px;
    color: var(--text);
  }

  .hero-card__header p {
    margin: 4px 0 0;
    color: var(--text-secondary);
    font-size: 12px;
  }
</style>
