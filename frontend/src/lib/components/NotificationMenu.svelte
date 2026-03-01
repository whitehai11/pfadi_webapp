<script lang="ts">
  import Icon from "$lib/components/Icon.svelte";
  import {
    markAllNotificationsAsRead,
    markNotificationAsRead,
    notificationsStore,
    unreadNotificationCount
  } from "$lib/stores/notifications";
  import { activeOverlayId, closeOverlay, overlayOutside, toggleOverlay } from "$lib/overlay";

  const OVERLAY_ID = "notification-menu";
  let open = false;
  $: open = $activeOverlayId === OVERLAY_ID;

  const formatTime = (createdAt: string) =>
    new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit"
    }).format(new Date(createdAt));
</script>

<div class="notification-menu" use:overlayOutside={{ id: OVERLAY_ID, enabled: open }}>
  <button
    class={`icon-button subtle-button notification-trigger ${$unreadNotificationCount > 0 ? "has-unread" : ""}`}
    type="button"
    aria-expanded={open}
    aria-label="Benachrichtigungen"
    on:click={() => toggleOverlay(OVERLAY_ID)}
  >
    <Icon name="bell" size={16} />
    {#if $unreadNotificationCount > 0}
      <span class="notification-badge">{$unreadNotificationCount}</span>
    {/if}
  </button>

  {#if open}
    <button class="notification-backdrop" type="button" aria-label="Schließen" on:click={() => closeOverlay(OVERLAY_ID)}></button>

    <div class="notification-panel" role="dialog" aria-label="Benachrichtigungen">
      <div class="notification-panel__handle" aria-hidden="true"></div>
      <header class="notification-panel__header">
        <div class="notification-panel__title">
          <strong>Benachrichtigungen</strong>
          {#if $unreadNotificationCount > 0}
            <span class="badge badge-info">{$unreadNotificationCount} neu</span>
          {/if}
        </div>
        <div class="notification-panel__actions">
          <button class="btn btn-outline" type="button" on:click={() => markAllNotificationsAsRead()}>Alle gelesen</button>
        </div>
      </header>

      {#if $notificationsStore.loading}
        <div class="notification-empty">
          <p class="text-muted">Lade Benachrichtigungen...</p>
        </div>
      {:else if $notificationsStore.items.length === 0}
        <div class="notification-empty">
          <p class="text-muted">Keine Benachrichtigungen vorhanden.</p>
        </div>
      {:else}
        <div class="notification-list">
          {#each $notificationsStore.items as item (item.id)}
            <button
              class={`notification-item ${item.is_read ? "is-read" : "is-unread"}`}
              type="button"
              on:click={() => {
                if (!item.is_read) {
                  void markNotificationAsRead(item.id);
                }
              }}
            >
              <div class="notification-item__copy">
                <strong>{item.title}</strong>
                <small>{item.message}</small>
                <small>{formatTime(item.created_at)}</small>
              </div>
              {#if !item.is_read}
                <span class="notification-dot" aria-hidden="true"></span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
