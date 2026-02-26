<script lang="ts">
  export let title = "";
  export let description = "";
  export let eyebrow = "";
  export let interactive = false;
</script>

<section class:card-interactive={interactive} class="surface-card">
  {#if title || description || eyebrow || $$slots.actions}
    <header class="surface-card__header">
      <div class="surface-card__copy">
        {#if eyebrow}
          <p class="surface-card__eyebrow">{eyebrow}</p>
        {/if}
        {#if title}
          <h2 class="surface-card__title">{title}</h2>
        {/if}
        {#if description}
          <p class="surface-card__description">{description}</p>
        {/if}
      </div>
      {#if $$slots.actions}
        <div class="surface-card__actions">
          <slot name="actions" />
        </div>
      {/if}
    </header>
  {/if}

  <div class="surface-card__body">
    <slot />
  </div>

  {#if $$slots.footer}
    <footer class="surface-card__footer">
      <slot name="footer" />
    </footer>
  {/if}
</section>
