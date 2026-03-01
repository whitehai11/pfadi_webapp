<script lang="ts">
  import Icon from "$lib/components/Icon.svelte";
  import { clearToasts, markAllToastsAsRead, markToastAsRead, toasts, unreadToastCount } from "$lib/toast";
  import { activeOverlayId, closeOverlay, overlayOutside, toggleOverlay } from "$lib/overlay";

  const OVERLAY_ID = "notification-menu";
  let open = false;
  $: open = $activeOverlayId === OVERLAY_ID;

  const formatTime = (createdAt: number) =>
    new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(createdAt));
</script>

<div class="notification-menu" use:overlayOutside={{ id: OVERLAY_ID, enabled: open }}>
  <button
    class={`icon-button subtle-button notification-trigger ${$unreadToastCount > 0 ? "has-unread" : ""}`}
    type="button"
    aria-expanded={open}
    aria-label="Benachrichtigungen"
    on:click={() => toggleOverlay(OVERLAY_ID)}
  >
    <Icon name="bell" size={16} />
    {#if $unreadToastCount > 0}
      <span class="notification-badge">{$unreadToastCount}</span>
    {/if}
  </button>

  {#if open}
    <button class="notification-backdrop" type="button" aria-label="Schließen" on:click={() => closeOverlay(OVERLAY_ID)}></button>

    <div class="notification-panel" role="dialog" aria-label="Benachrichtigungen">
      <div class="notification-panel__handle" aria-hidden="true"></div>
      <header class="notification-panel__header">
        <div class="notification-panel__title">
          <strong>Benachrichtigungen</strong>
          {#if $unreadToastCount > 0}
            <span class="badge badge-info">{$unreadToastCount} neu</span>
          {/if}
        </div>
        <div class="notification-panel__actions">
          <button class="btn btn-outline" type="button" on:click={markAllToastsAsRead}>Alle gelesen</button>
          <button class="btn btn-outline" type="button" on:click={clearToasts}>Leeren</button>
        </div>
      </header>

      {#if $toasts.length === 0}
        <div class="notification-empty">
          <p class="text-muted">Keine Benachrichtigungen vorhanden.</p>
        </div>
      {:else}
        <div class="notification-list">
          {#each [...$toasts].reverse() as item (item.id)}
            <button
              class={`notification-item ${item.read ? "is-read" : "is-unread"}`}
              type="button"
              on:click={() => {
                markToastAsRead(item.id);
              }}
            >
              <div class="notification-item__copy">
                <strong>{item.message}</strong>
                <small>{formatTime(item.createdAt)}</small>
              </div>
              {#if !item.read}
                <span class="notification-dot" aria-hidden="true"></span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
