<script lang="ts">
  import { dismissToast, markToastAsRead, toasts } from "$lib/toast";
</script>

<div class="toast-stack" aria-live="polite" aria-atomic="true">
  {#each $toasts as toast (toast.id)}
    <button
      class={`toast toast-${toast.type}`}
      type="button"
      on:click={() => {
        markToastAsRead(toast.id);
        dismissToast(toast.id);
      }}
    >
      {toast.message}
    </button>
  {/each}
</div>
