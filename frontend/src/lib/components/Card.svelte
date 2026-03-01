<script lang="ts">
  export let title = "";
  export let description = "";
  export let eyebrow = "";
  export let interactive = false;
  export let id = "";
</script>

<section
  id={id || undefined}
  class:card-interactive={interactive}
  class="surface-card"
  data-has-description={description ? "true" : undefined}
>
  {#if title || eyebrow || $$slots.actions}
    <header class="surface-card__header">
      <div class="surface-card__copy">
        {#if eyebrow}
          <p class="surface-card__eyebrow">{eyebrow}</p>
        {/if}
        {#if title}
          <h2 class="surface-card__title">{title}</h2>
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
