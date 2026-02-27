<script lang="ts">
  export let open = false;
  export let title = "";
  export let subtitle = "";
  export let onClose: (() => void) | undefined = undefined;
</script>

{#if open}
  <div class="slide-over">
    <button class="slide-over__backdrop" type="button" aria-label="Schließen" on:click={() => onClose?.()}></button>
    <div class="slide-over__panel" aria-modal="true" role="dialog" aria-label={title}>
      <header class="slide-over__header">
        <div class="slide-over__copy">
          <p class="slide-over__eyebrow">Termin-Erinnerung</p>
          <h2 class="slide-over__title">{title}</h2>
          {#if subtitle}
            <p class="slide-over__subtitle">{subtitle}</p>
          {/if}
        </div>
        <button class="slide-over__close" type="button" on:click={() => onClose?.()}>Fertig</button>
      </header>

      <div class="slide-over__body">
        <slot />
      </div>

      {#if $$slots.footer}
        <footer class="slide-over__footer">
          <slot name="footer" />
        </footer>
      {/if}
    </div>
  </div>
{/if}

<style>
  .slide-over {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: flex;
    justify-content: flex-end;
  }

  .slide-over__backdrop {
    position: absolute;
    inset: 0;
    border: 0;
    background: rgba(29, 29, 31, 0.18);
    backdrop-filter: blur(6px);
  }

  .slide-over__panel {
    position: relative;
    width: min(100%, 480px);
    height: 100%;
    background: #f5f5f7;
    box-shadow: -20px 0 60px rgba(15, 23, 42, 0.12);
    display: grid;
    grid-template-rows: auto 1fr auto;
    animation: slideIn 150ms ease;
  }

  .slide-over__header,
  .slide-over__footer {
    padding: 1.25rem;
    background: rgba(245, 245, 247, 0.92);
    backdrop-filter: blur(14px);
  }

  .slide-over__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 1px solid rgba(29, 29, 31, 0.08);
  }

  .slide-over__body {
    overflow: auto;
    padding: 1.25rem;
    display: grid;
    gap: 1rem;
    align-content: start;
  }

  .slide-over__footer {
    border-top: 1px solid rgba(29, 29, 31, 0.08);
  }

  .slide-over__copy {
    display: grid;
    gap: 0.25rem;
  }

  .slide-over__eyebrow {
    margin: 0;
    font-size: 0.76rem;
    font-weight: 600;
    color: #007aff;
  }

  .slide-over__title {
    margin: 0;
    font-size: 1.35rem;
    line-height: 1.1;
    color: #1d1d1f;
  }

  .slide-over__subtitle {
    margin: 0;
    color: #6e6e73;
    line-height: 1.45;
  }

  .slide-over__close {
    border: 0;
    background: rgba(29, 29, 31, 0.06);
    color: #1d1d1f;
    border-radius: 999px;
    padding: 0.65rem 0.9rem;
    min-height: 42px;
    cursor: pointer;
  }

  @keyframes slideIn {
    from {
      transform: translateX(24px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @media (max-width: 720px) {
    .slide-over__panel {
      width: 100%;
    }
  }
</style>
