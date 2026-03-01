<script lang="ts">
  import { goto } from "$app/navigation";
  import { onDestroy, onMount, tick } from "svelte";
  import { commandIndex, loadCommandIndex, type CommandEntry } from "$lib/command-index";
  import { activeOverlayId, closeOverlay, overlayOutside, toggleOverlay } from "$lib/overlay";
  import { pushToast } from "$lib/toast";

  export let isAdmin = false;
  export let enabled = true;

  const OVERLAY_ID = "command-palette";
  const MAX_RESULTS = 12;

  let query = "";
  let selectedIndex = 0;
  let inputEl: HTMLInputElement | null = null;
  let open = false;
  let results: CommandEntry[] = [];

  const scoreResult = (item: CommandEntry, normalized: string) => {
    const title = item.title.toLowerCase();
    const subtitle = item.subtitle.toLowerCase();
    const keywords = item.keywords.toLowerCase();

    if (!normalized) return 100;
    if (title.startsWith(normalized)) return 90;
    if (title.includes(normalized)) return 70;
    if (keywords.includes(normalized)) return 50;
    if (subtitle.includes(normalized)) return 40;
    return 0;
  };

  const recalc = (items: CommandEntry[]) => {
    const normalized = query.trim().toLowerCase();
    const ranked = items
      .map((item) => ({ item, score: scoreResult(item, normalized) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
      .map((entry) => entry.item);

    results = ranked.slice(0, MAX_RESULTS);
    if (selectedIndex >= results.length) {
      selectedIndex = Math.max(0, results.length - 1);
    }
  };

  const ensureLoaded = async () => {
    if (!enabled) return;
    await loadCommandIndex({ isAdmin });
  };

  const onTogglePalette = async () => {
    if (!enabled) return;
    toggleOverlay(OVERLAY_ID);
    if ($activeOverlayId !== OVERLAY_ID) return;
    await ensureLoaded();
    await tick();
    inputEl?.focus();
    inputEl?.select();
  };

  const executeEntry = async (entry: CommandEntry | undefined) => {
    if (!entry) return;
    closeOverlay(OVERLAY_ID);
    query = "";
    selectedIndex = 0;

    if (entry.id === "quick:create-task") {
      pushToast("Packlisten geöffnet.", "success", 1200);
    }

    await goto(entry.href);
  };

  const onInputKeyDown = async (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (results.length === 0) return;
      selectedIndex = (selectedIndex + 1) % results.length;
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length === 0) return;
      selectedIndex = (selectedIndex - 1 + results.length) % results.length;
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      await executeEntry(results[selectedIndex]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeOverlay(OVERLAY_ID);
    }
  };

  const onGlobalKeyDown = async (event: KeyboardEvent) => {
    if (!enabled) return;
    const isToggle = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
    if (!isToggle) return;
    event.preventDefault();
    await onTogglePalette();
  };

  onMount(() => {
    window.addEventListener("keydown", onGlobalKeyDown);
  });

  onDestroy(() => {
    window.removeEventListener("keydown", onGlobalKeyDown);
  });

  $: open = $activeOverlayId === OVERLAY_ID;
  $: recalc($commandIndex.items);
  $: if (open) {
    void ensureLoaded();
  }
</script>

{#if open}
  <div class="command-palette-layer">
    <button class="command-palette-backdrop" type="button" aria-label="Schließen" on:click={() => closeOverlay(OVERLAY_ID)}></button>
    <div
      class="command-palette"
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      use:overlayOutside={{ id: OVERLAY_ID, enabled: open }}
    >
      <header class="command-palette__header">
        <input
          bind:this={inputEl}
          class="input command-palette__input"
          type="text"
          value={query}
          on:input={(event) => {
            query = (event.currentTarget as HTMLInputElement).value;
            selectedIndex = 0;
          }}
          on:keydown={onInputKeyDown}
          placeholder="Suche nach Seiten, Nutzern, Terminen, Boxen, Chats..."
          aria-label="Suche"
        />
      </header>

      <div class="command-palette__results">
        {#if $commandIndex.loading}
          <p class="text-muted">Index wird geladen...</p>
        {:else if results.length === 0}
          <p class="text-muted">Keine Treffer.</p>
        {:else}
          {#each results as item, index (item.id)}
            <button
              class={`command-palette__item ${index === selectedIndex ? "is-active" : ""}`}
              type="button"
              on:click={() => executeEntry(item)}
            >
              <div class="list-meta">
                <strong>{item.title}</strong>
                <span class="text-muted">{item.subtitle}</span>
              </div>
              <span class="badge badge-secondary">{item.group}</span>
            </button>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}
