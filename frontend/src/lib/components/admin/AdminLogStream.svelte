<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import { adminLogsStore, subscribeAdminChannel } from "$lib/admin/ws/stores";

  type LogItem = {
    ts: string;
    level: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
    msg: string;
    context?: Record<string, unknown>;
  };

  let logs: LogItem[] = [];
  let paused = false;
  let minLevel: LogItem["level"] = "info";
  let autoScroll = true;
  let container: HTMLDivElement | null = null;
  let mounted = false;
  let unsubscribeChannel: (() => void) | null = null;
  let unsubscribeStore: (() => void) | null = null;

  const levelFilter = () => {
    if (minLevel === "trace") return ["trace", "debug", "info", "warn", "error", "fatal"];
    if (minLevel === "debug") return ["debug", "info", "warn", "error", "fatal"];
    if (minLevel === "info") return ["info", "warn", "error", "fatal"];
    if (minLevel === "warn") return ["warn", "error", "fatal"];
    if (minLevel === "error") return ["error", "fatal"];
    return ["fatal"];
  };

  const resubscribe = () => {
    unsubscribeChannel?.();
    unsubscribeChannel = subscribeAdminChannel("logs", {
      level: levelFilter()
    });
  };

  onMount(() => {
    mounted = true;
    unsubscribeStore = adminLogsStore.subscribe((value) => {
      if (paused) return;
      logs = value as LogItem[];
      if (autoScroll) {
        queueMicrotask(() => {
          if (!container) return;
          container.scrollTop = container.scrollHeight;
        });
      }
    });
    resubscribe();
  });

  onDestroy(() => {
    mounted = false;
    unsubscribeChannel?.();
    unsubscribeStore?.();
  });

  $: if (mounted) {
    minLevel;
    resubscribe();
  }
</script>

<section class="section-block">
  <h2 class="section-title">Real-time Log Stream</h2>
  <Card title="Log Stream">
    <div class="actions">
      <button class="btn btn-outline" type="button" on:click={() => (paused = !paused)}>
        {paused ? "Resume" : "Pause"}
      </button>
      <label>
        <span class="text-muted">Level</span>
        <select bind:value={minLevel}>
          <option value="trace">trace</option>
          <option value="debug">debug</option>
          <option value="info">info</option>
          <option value="warn">warn</option>
          <option value="error">error</option>
          <option value="fatal">fatal</option>
        </select>
      </label>
      <label class="toggle-inline">
        <input type="checkbox" bind:checked={autoScroll} />
        <span>Auto-scroll</span>
      </label>
      <button class="btn btn-outline" type="button" on:click={() => (logs = [])}>Clear</button>
    </div>

    <div class="log-terminal" bind:this={container}>
      {#each logs as item, idx (`${item.ts}-${idx}`)}
        <div class={`log-line level-${item.level}`}>
          <span class="log-ts">{item.ts}</span>
          <span class="log-level">{item.level.toUpperCase()}</span>
          <span class="log-msg">{item.msg}</span>
        </div>
      {/each}
    </div>
  </Card>
</section>

<style>
  .log-terminal {
    max-height: 420px;
    overflow: auto;
    padding: var(--space-1);
    border-radius: var(--radius-sm);
    background: var(--surface-subtle);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    font-size: 12px;
    line-height: 1.45;
  }

  .log-line {
    display: grid;
    grid-template-columns: auto auto 1fr;
    gap: 8px;
    padding: 2px 0;
  }

  .log-ts {
    color: var(--color-text-muted);
  }

  .log-level {
    font-weight: 600;
  }

  .level-warn .log-level {
    color: #b7791f;
  }

  .level-error .log-level,
  .level-fatal .log-level {
    color: #c53030;
  }
</style>
