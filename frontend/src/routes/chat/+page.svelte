<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import Avatar from "$lib/components/Avatar.svelte";
  import Card from "$lib/components/Card.svelte";
  import { session } from "$lib/auth";
  import { pushToast } from "$lib/toast";
  import {
    chatStore,
    createDirectConversation,
    createGroupConversation,
    refreshChatData,
    retryChatMessage,
    selectConversation,
    sendChatMessage,
    sendReadReceipt,
    sendTypingState,
    startChatRealtime,
    stopChatRealtime
  } from "$lib/stores/chat";

  let messageInput = "";
  let composerFocused = false;
  let scrollEl: HTMLDivElement | null = null;
  let lastActiveCount = 0;
  let typingTimeout: number | null = null;
  let selectedUserId = "";
  let groupName = "";
  let groupMembers = new Set<string>();

  const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit"
    });

  const formatDateTime = (value: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
  };

  const statusSymbol = (status: "sending" | "delivered" | "read" | "failed") => {
    if (status === "sending") return "...";
    if (status === "delivered") return "✓";
    if (status === "read") return "✓✓";
    return "!";
  };

  const scrollToBottom = async () => {
    await tick();
    if (!scrollEl) return;
    scrollEl.scrollTop = scrollEl.scrollHeight;
  };

  const setTypingDebounced = () => {
    sendTypingState(Boolean(messageInput.trim()) && composerFocused);
    if (typingTimeout !== null) clearTimeout(typingTimeout);
    typingTimeout = window.setTimeout(() => {
      sendTypingState(false);
    }, 2500);
  };

  const submitMessage = async () => {
    const content = messageInput.trim();
    if (!content) return;
    sendChatMessage(content);
    messageInput = "";
    sendTypingState(false);
    await scrollToBottom();
  };

  const startDirectChat = async () => {
    if (!selectedUserId) return;
    try {
      await createDirectConversation(selectedUserId);
      selectedUserId = "";
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Direktchat konnte nicht erstellt werden.", "error");
    }
  };

  const toggleGroupMember = (userId: string, checked: boolean) => {
    const next = new Set(groupMembers);
    if (checked) next.add(userId);
    else next.delete(userId);
    groupMembers = next;
  };

  const createGroup = async () => {
    const members = Array.from(groupMembers);
    if (!groupName.trim() || members.length === 0) return;
    try {
      await createGroupConversation(groupName.trim(), members);
      groupName = "";
      groupMembers = new Set<string>();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Gruppe konnte nicht erstellt werden.", "error");
    }
  };

  onMount(() => {
    startChatRealtime();
    void refreshChatData();
  });

  onDestroy(() => {
    stopChatRealtime();
    if (typingTimeout !== null) clearTimeout(typingTimeout);
  });

  $: activeConversation = $chatStore.conversations.find((conversation) => conversation.id === $chatStore.activeConversationId) ?? null;
  $: activeMessages = activeConversation ? ($chatStore.messagesByConversation[activeConversation.id] ?? []) : [];
  $: typingCount = activeConversation ? ($chatStore.typingByConversation[activeConversation.id] ?? []).length : 0;
  $: onlineCount = activeConversation ? ($chatStore.onlineByConversation[activeConversation.id] ?? []).length : 0;
  $: isDev = $session?.role === "dev";

  $: if ($chatStore.lastError) {
    pushToast($chatStore.lastError, "error");
  }

  $: if (activeConversation && activeMessages.length !== lastActiveCount) {
    lastActiveCount = activeMessages.length;
    void scrollToBottom();
    const latest = activeMessages[activeMessages.length - 1];
    if (latest?.id) {
      sendReadReceipt(latest.id);
    }
  }
</script>

<div class="page-stack">
  <section class="page-intro">
    <h1 class="page-title">Chat</h1>
  </section>

  {#if !$session}
    <Card title="Nicht verfügbar">
      <p class="text-muted">Anmeldung erforderlich.</p>
    </Card>
  {:else}
    <section class="chat-layout">
      <aside class="chat-sidebar glass-panel">
        <header class="chat-sidebar__header">
          <h2>Konversationen</h2>
          <span class={`badge ${$chatStore.connected ? "badge-success" : "badge-warning"}`}>{$chatStore.socketState}</span>
        </header>

        <div class="chat-sidebar__actions">
          <select class="input" bind:value={selectedUserId}>
            <option value="">Direktnachricht starten</option>
            {#each $chatStore.users as user}
              <option value={user.id}>{user.username}</option>
            {/each}
          </select>
          <button class="btn btn-outline" type="button" on:click={() => void startDirectChat()} disabled={!selectedUserId}>
            Starten
          </button>
        </div>

        <div class="chat-sidebar__group-builder">
          <input class="input" placeholder="Gruppenname" bind:value={groupName} />
          <div class="member-list">
            {#each $chatStore.users as user}
              <label class="member-item">
                <input
                  type="checkbox"
                  checked={groupMembers.has(user.id)}
                  on:change={(event) => toggleGroupMember(user.id, (event.currentTarget as HTMLInputElement).checked)}
                />
                <span>{user.username}</span>
              </label>
            {/each}
          </div>
          <button class="btn btn-outline" type="button" on:click={() => void createGroup()} disabled={!groupName.trim() || groupMembers.size === 0}>
            Gruppe erstellen
          </button>
        </div>

        <nav class="conversation-list" aria-label="Konversationen">
          {#if $chatStore.conversations.length === 0}
            <p class="text-muted">Keine Konversationen.</p>
          {:else}
            {#each $chatStore.conversations as conversation}
              <button
                type="button"
                class={`conversation-item ${$chatStore.activeConversationId === conversation.id ? "is-active" : ""}`}
                on:click={() => void selectConversation(conversation.id)}
              >
                <div class="conversation-item__title">
                  <strong>{conversation.name}</strong>
                  <small>{conversation.type}</small>
                </div>
                <p>{conversation.last_message_preview ?? "Keine Nachrichten"}</p>
                <span class="text-muted">{formatDateTime(conversation.last_message_at)}</span>
              </button>
            {/each}
          {/if}
        </nav>
      </aside>

      <section class="chat-main glass-panel">
        {#if !activeConversation}
          <div class="chat-empty">
            <p>Bitte eine Konversation auswählen.</p>
          </div>
        {:else}
          <header class="chat-main__header">
            <div>
              <h2>{activeConversation.name}</h2>
              <p class="text-muted">{activeConversation.member_count} Mitglieder · {onlineCount} online</p>
            </div>
          </header>

          <div bind:this={scrollEl} class="chat-thread" role="log" aria-label="Nachrichten">
            {#if activeMessages.length === 0}
              <div class="empty-state">
                <p>Keine Nachrichten.</p>
              </div>
            {:else}
              {#each activeMessages as message (message.localId)}
                <article class="chat-message" class:own={message.senderId === $session?.id}>
                  <header class="chat-meta">
                    <Avatar name={message.senderName} avatarUrl={null} size={36} />
                    <div class="chat-meta__text">
                      <strong>{message.senderName}</strong>
                      <span class="text-muted">{formatTime(message.createdAt)}</span>
                    </div>
                    {#if message.senderId === $session?.id}
                      <span class={`delivery ${message.status}`}>{statusSymbol(message.status)}</span>
                    {/if}
                  </header>
                  <div class="chat-bubble">
                    <p>{message.content}</p>
                  </div>
                  {#if message.status === "failed"}
                    <div class="chat-error-row">
                      <span class="status-banner error">Senden fehlgeschlagen.</span>
                      <button class="btn btn-outline" type="button" on:click={() => retryChatMessage(message.localId)}>
                        Erneut senden
                      </button>
                    </div>
                  {/if}
                </article>
              {/each}
            {/if}
          </div>

          {#if typingCount > 0}
            <p class="typing-indicator">{typingCount} tippt...</p>
          {/if}

          <form class="chat-composer glass-composer" on:submit|preventDefault={submitMessage}>
            <textarea
              class="textarea"
              rows="3"
              bind:value={messageInput}
              placeholder="Nachricht schreiben..."
              maxlength="4000"
              on:focus={() => {
                composerFocused = true;
                setTypingDebounced();
              }}
              on:blur={() => {
                composerFocused = false;
                sendTypingState(false);
              }}
              on:input={setTypingDebounced}
            ></textarea>
            <div class="chat-composer__actions">
              <button class="btn btn-primary" type="submit" disabled={!messageInput.trim()}>
                Senden
              </button>
            </div>
          </form>

          {#if isDev}
            <details class="ws-debug">
              <summary>WebSocket Debug</summary>
              <div class="ws-debug__meta">
                <span>Status: {$chatStore.socketState}</span>
                <span>Events: {$chatStore.debugEvents.length}</span>
              </div>
              <div class="ws-debug__list" role="log" aria-label="WebSocket Debug Events">
                {#if $chatStore.debugEvents.length === 0}
                  <p class="text-muted">Keine Events.</p>
                {:else}
                  {#each $chatStore.debugEvents as event, index (event.ts + ":" + index)}
                    <article class="ws-debug__item">
                      <header>
                        <strong>{event.direction}</strong>
                        <span class="text-muted">{event.type}</span>
                        <time class="text-muted">{formatDateTime(event.ts)}</time>
                      </header>
                      <pre>{JSON.stringify(event.payload, null, 2)}</pre>
                    </article>
                  {/each}
                {/if}
              </div>
            </details>
          {/if}
        {/if}
      </section>
    </section>
  {/if}
</div>

<style>
  .chat-layout {
    display: grid;
    grid-template-columns: minmax(260px, 320px) 1fr;
    gap: var(--space-2);
    min-height: 72vh;
  }

  .glass-panel {
    border-radius: 18px;
    background: var(--surface-panel);
    backdrop-filter: blur(18px) saturate(130%);
    box-shadow: var(--shadow-elev);
    border: 1px solid var(--border-card);
    padding: var(--space-2);
  }

  .chat-sidebar {
    display: grid;
    gap: var(--space-1);
    align-content: start;
  }

  .chat-sidebar__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-1);
  }

  .chat-sidebar__header h2 {
    margin: 0;
    font-size: 1rem;
  }

  .chat-sidebar__actions {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--space-1);
  }

  .chat-sidebar__group-builder {
    display: grid;
    gap: 8px;
    padding: 10px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--surface-subtle) 76%, transparent);
  }

  .member-list {
    display: grid;
    gap: 6px;
    max-height: 120px;
    overflow-y: auto;
  }

  .member-item {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 30px;
    font-size: 13px;
  }

  .conversation-list {
    display: grid;
    gap: 8px;
    overflow-y: auto;
    max-height: 52vh;
  }

  .conversation-item {
    border: none;
    border-radius: 14px;
    background: var(--surface-subtle);
    padding: 10px;
    text-align: left;
    cursor: pointer;
    display: grid;
    gap: 4px;
    min-height: 64px;
  }

  .conversation-item.is-active {
    background: color-mix(in srgb, var(--accent) 14%, var(--surface-subtle) 86%);
  }

  .conversation-item__title {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .conversation-item__title small {
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .conversation-item p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chat-main {
    display: grid;
    grid-template-rows: auto 1fr auto auto;
    gap: var(--space-1);
  }

  .chat-main__header h2 {
    margin: 0;
  }

  .chat-main__header p {
    margin: 4px 0 0;
  }

  .chat-thread {
    display: grid;
    gap: var(--space-1);
    overflow-y: auto;
    min-height: 38vh;
    max-height: 54vh;
    padding-right: 4px;
  }

  .chat-message {
    display: grid;
    gap: 6px;
  }

  .chat-message.own .chat-bubble {
    background: color-mix(in srgb, var(--accent) 14%, var(--surface-subtle) 86%);
  }

  .chat-meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .chat-meta__text {
    display: grid;
    gap: 2px;
  }

  .chat-bubble {
    border-radius: 16px;
    background: var(--surface-subtle);
    padding: 12px 14px;
    box-shadow: var(--shadow-sm);
  }

  .chat-bubble p {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .delivery {
    margin-left: auto;
    color: var(--text-secondary);
    font-weight: 600;
  }

  .delivery.read {
    color: var(--accent);
  }

  .delivery.failed {
    color: var(--danger);
  }

  .chat-error-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .typing-indicator {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .chat-composer {
    display: grid;
    gap: 8px;
  }

  .glass-composer {
    border-radius: 14px;
    background: color-mix(in srgb, var(--surface-subtle) 80%, transparent);
    padding: 10px;
  }

  .chat-composer__actions {
    display: flex;
    justify-content: flex-end;
  }

  .chat-empty {
    display: grid;
    place-items: center;
    min-height: 44vh;
  }

  .ws-debug {
    border-radius: 12px;
    background: color-mix(in srgb, var(--surface-subtle) 84%, transparent);
    padding: 10px;
  }

  .ws-debug summary {
    cursor: pointer;
    font-weight: 600;
  }

  .ws-debug__meta {
    margin-top: 8px;
    display: flex;
    gap: 12px;
    color: var(--text-secondary);
    font-size: 0.85rem;
  }

  .ws-debug__list {
    margin-top: 10px;
    max-height: 220px;
    overflow: auto;
    display: grid;
    gap: 8px;
  }

  .ws-debug__item {
    border-radius: 10px;
    background: var(--surface-subtle);
    padding: 8px;
  }

  .ws-debug__item header {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 0.8rem;
  }

  .ws-debug__item pre {
    margin: 8px 0 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 0.75rem;
  }

  @media (max-width: 980px) {
    .chat-layout {
      grid-template-columns: 1fr;
    }

    .conversation-list {
      max-height: 28vh;
    }
  }
</style>
