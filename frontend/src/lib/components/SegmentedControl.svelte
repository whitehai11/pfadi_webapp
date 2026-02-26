<script lang="ts">
  export let value = "";
  export let options: { value: string; label: string }[] = [];
  export let ariaLabel = "";
</script>

<div class="segmented-control" role="radiogroup" aria-label={ariaLabel}>
  {#each options as option}
    <button
      type="button"
      class:selected={value === option.value}
      aria-pressed={value === option.value}
      on:click={() => (value = option.value)}
    >
      {option.label}
    </button>
  {/each}
</div>
