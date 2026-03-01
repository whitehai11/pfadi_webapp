<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import Avatar from "$lib/components/Avatar.svelte";
  import { session } from "$lib/auth";
  import { pushToast } from "$lib/toast";
  import {
    chatStore,
    sendChatMessage,
    retryChatMessage,
    sendReadReceipt,
    sendTypingState,
    startChatRealtime,
    stopChatRealtime
  } from "$lib/stores/chat";

  let messageInput = "";
  let composerFocused = false;
  let scrollEl: HTMLDivElement | null = null;
  let lastMessageCount = 0;
  let typingTimeout: number | null = null;

  const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit"
    });

  const scrollToBottom = async () => {
    await tick();
    if (!scrollEl) return;
    scrollEl.scrollTop = scrollEl.scrollHeight;
  };

  const setTypingDebounced = () => {
    sendTypingState(Boolean(messageInput.trim()) && composerFocused);
    if (typingTimeout !== null) {
      clearTimeout(typingTimeout);
    }
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

  const statusSymbol = (status: "sending" | "delivered" | "read" | "failed") => {
    if (status === "sending") return "…";
    if (status === "delivered") return "✓";
    if (status === "read") return "✓✓";
    return "!";
  };

  onMount(() => {
    startChatRealtime();
  });

  onDestroy(() => {
    stopChatRealtime();
    if (typingTimeout !== null) clearTimeout(typingTimeout);
  });

  $: if ($chatStore.lastError) {
    pushToast($chatStore.lastError, "error");
  }

  $: if ($chatStore.messages.length !== lastMessageCount) {
    lastMessageCount = $chatStore.messages.length;
    void scrollToBottom();
    const latest = $chatStore.messages[$chatStore.messages.length - 1];
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
    <Card title="Nicht verfugbar">
      <p class="text-muted">Anmeldung erforderlich.</p>
    </Card>
  {:else}
    <section class="chat-shell">
      <Card title="Status">
        <div class="status-row">
          <span class="text-muted">Verbindung</span>
          <span class={`badge ${$chatStore.connected ? "badge-success" : "badge-warning"}`}>
            {$chatStore.socketState}
          </span>
        </div>
        <div class="status-row">
          <span class="text-muted">Online</span>
          <span class="badge badge-secondary">{$chatStore.onlineUserIds.length}</span>
        </div>
      </Card>

      <section class="chat-panel surface-card">
        <div bind:this={scrollEl} class="chat-thread" role="log" aria-label="Nachrichten">
          {#if $chatStore.messages.length === 0}
            <div class="empty-state">
              <p>Keine Nachrichten.</p>
            </div>
          {:else}
            {#each $chatStore.messages as message (message.localId)}
              <article class="chat-message" class:own={message.senderId === $session?.id}>
                <header class="chat-meta">
                  <Avatar name={message.senderName} avatarUrl={null} size={40} />
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

        {#if $chatStore.typingUserIds.length > 0}
          <p class="typing-indicator">{$chatStore.typingUserIds.length} tippt...</p>
        {/if}

        <form class="chat-composer" on:submit|preventDefault={submitMessage}>
          <textarea
            class="textarea"
            rows="3"
            bind:value={messageInput}
            placeholder="Nachricht schreiben..."
            on:focus={() => {
              composerFocused = true;
              setTypingDebounced();
            }}
            on:blur={() => {
              composerFocused = false;
              sendTypingState(false);
            }}
            on:input={setTypingDebounced}
            maxlength="4000"
          ></textarea>
          <div class="chat-composer__actions">
            <button class="btn btn-primary" type="submit" disabled={!messageInput.trim()}>
              Senden
            </button>
          </div>
        </form>
      </section>
    </section>
  {/if}
</div>

<style>
  .chat-shell {
    display: grid;
    gap: var(--space-2);
  }

  .chat-panel {
    display: grid;
    gap: var(--space-1);
    min-height: 65vh;
  }

  .chat-thread {
    display: grid;
    gap: var(--space-1);
    overflow-y: auto;
    max-height: 55vh;
    padding-right: 0.25rem;
  }

  .chat-message {
    display: grid;
    gap: 0.5rem;
  }

  .chat-message.own .chat-bubble {
    background: color-mix(in srgb, var(--color-primary) 12%, var(--color-card) 88%);
  }

  .chat-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .chat-meta__text {
    display: grid;
    gap: 0.1rem;
  }

  .chat-bubble {
    background: var(--color-card);
    border-radius: 16px;
    padding: 0.85rem 1rem;
    box-shadow: var(--shadow-soft);
  }

  .chat-bubble p {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .chat-error-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .delivery {
    margin-left: auto;
    font-weight: 600;
    color: var(--color-muted);
  }

  .delivery.read {
    color: var(--color-primary);
  }

  .delivery.failed {
    color: var(--color-danger);
  }

  .typing-indicator {
    margin: 0;
    color: var(--color-muted);
    font-size: 0.9rem;
  }

  .chat-composer {
    display: grid;
    gap: 0.75rem;
    margin-top: auto;
  }

  .chat-composer__actions {
    display: flex;
    justify-content: flex-end;
  }

  .status-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.25rem 0;
  }
</style>
