<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import { session } from "$lib/auth";
  import { pushToast } from "$lib/toast";
  import { apiFetch } from "$lib/api";
  import {
    matrixStore,
    startMatrix,
    stopMatrix,
    sendMessage,
    sendFile,
    setTyping,
    setActiveRoom,
    createGroup,
    startDM
  } from "$lib/stores/matrix";
  import { mxcToHttp } from "$lib/matrix/client";

  let messageInput = "";
  let scrollEl: HTMLDivElement | null = null;
  let fileInput: HTMLInputElement | null = null;
  let typingTimeout: ReturnType<typeof setTimeout> | null = null;
  let lastMessageCount = 0;
  let sending = false;

  // Modal state
  let showNewGroup = false;
  let showNewDM = false;
  let newGroupName = "";
  let newDMTarget = "";
  let modalBusy = false;

  // Matrix users list for DM autocomplete
  type MxUser = { matrix_user_id: string; email: string | null };
  let mxUsers: MxUser[] = [];

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  const scrollToBottom = async () => {
    await tick();
    if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
  };

  const onTypingInput = () => {
    void setTyping(Boolean(messageInput.trim()));
    if (typingTimeout !== null) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => void setTyping(false), 3000);
  };

  const submit = async () => {
    const text = messageInput.trim();
    if (!text || sending) return;
    sending = true;
    messageInput = "";
    if (typingTimeout !== null) clearTimeout(typingTimeout);
    void setTyping(false);
    try {
      await sendMessage(text);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Senden fehlgeschlagen.", "error");
      messageInput = text;
    } finally {
      sending = false;
    }
  };

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const pickFile = () => fileInput?.click();

  const onFileSelected = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = "";
    if (file.size > 20 * 1024 * 1024) {
      pushToast("Datei ist zu groß (max. 20 MB).", "error");
      return;
    }
    try {
      await sendFile(file);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Upload fehlgeschlagen.", "error");
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    modalBusy = true;
    try {
      const roomId = await createGroup(newGroupName.trim());
      setActiveRoom(roomId);
      showNewGroup = false;
      newGroupName = "";
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Fehler beim Erstellen.", "error");
    } finally {
      modalBusy = false;
    }
  };

  const handleStartDM = async () => {
    const target = newDMTarget.trim();
    if (!target) return;
    const matrixId = target.startsWith("@") ? target : `@${target}:matrix.uvh.maro.run`;
    modalBusy = true;
    try {
      const roomId = await startDM(matrixId);
      setActiveRoom(roomId);
      showNewDM = false;
      newDMTarget = "";
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Fehler beim Erstellen.", "error");
    } finally {
      modalBusy = false;
    }
  };

  const loadMxUsers = async () => {
    try {
      const data = await apiFetch<MxUser[]>("/api/matrix/users");
      mxUsers = (data ?? []).filter((u) => u.matrix_user_id !== $matrixStore.userId);
    } catch { /* silent */ }
  };

  onMount(() => {
    void startMatrix();
    void loadMxUsers();
  });

  onDestroy(() => {
    stopMatrix();
    if (typingTimeout !== null) clearTimeout(typingTimeout);
  });

  $: if ($matrixStore.error) pushToast($matrixStore.error, "error");

  $: activeMessages = $matrixStore.activeRoomId
    ? ($matrixStore.messages[$matrixStore.activeRoomId] ?? [])
    : [];

  $: if (activeMessages.length !== lastMessageCount) {
    lastMessageCount = activeMessages.length;
    void scrollToBottom();
  }

  $: homeserverUrl = $matrixStore.homeserverUrl ?? "";
  $: myUserId = $matrixStore.userId ?? "";

  $: groups = $matrixStore.rooms.filter((r) => !r.isDM);
  $: dms = $matrixStore.rooms.filter((r) => r.isDM);

  $: activeRoom = $matrixStore.rooms.find((r) => r.roomId === $matrixStore.activeRoomId);
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
    <div class="chat-wrap">
      <!-- Sidebar -->
      <aside class="chat-sidebar glass-panel">
        <div class="sidebar-section">
          <div class="sidebar-heading">
            <span>Räume</span>
            <button class="icon-btn" title="Neuer Raum" on:click={() => (showNewGroup = true)}>+</button>
          </div>
          {#each groups as room (room.roomId)}
            <button
              class="room-item"
              class:active={room.roomId === $matrixStore.activeRoomId}
              on:click={() => setActiveRoom(room.roomId)}
            >
              <span class="room-icon">#</span>
              <span class="room-name">{room.name}</span>
            </button>
          {/each}
          {#if groups.length === 0 && $matrixStore.status === "ready"}
            <p class="sidebar-empty">Keine Räume</p>
          {/if}
        </div>

        <div class="sidebar-section">
          <div class="sidebar-heading">
            <span>Direktnachrichten</span>
            <button class="icon-btn" title="Neue DM" on:click={() => (showNewDM = true)}>+</button>
          </div>
          {#each dms as room (room.roomId)}
            <button
              class="room-item"
              class:active={room.roomId === $matrixStore.activeRoomId}
              on:click={() => setActiveRoom(room.roomId)}
            >
              <span class="room-icon dm-icon">@</span>
              <span class="room-name">{room.name}</span>
            </button>
          {/each}
          {#if dms.length === 0 && $matrixStore.status === "ready"}
            <p class="sidebar-empty">Keine DMs</p>
          {/if}
        </div>
      </aside>

      <!-- Main chat -->
      <section class="chat-layout glass-panel">
        <header class="chat-header">
          <div class="chat-header__info">
            {#if activeRoom}
              <span class="room-tag">{activeRoom.isDM ? "@" : "#"}</span>
              <h2>{activeRoom.name}</h2>
            {:else}
              <h2>Chat</h2>
            {/if}
            <span class={`status-dot ${$matrixStore.status === "ready" ? "online" : "offline"}`}></span>
            <span class="text-muted status-label">
              {#if $matrixStore.status === "connecting"}Verbinde...{:else if $matrixStore.status === "ready"}Verbunden{:else if $matrixStore.status === "error"}Fehler{:else}—{/if}
            </span>
          </div>
        </header>

        <div bind:this={scrollEl} class="chat-thread" role="log" aria-label="Nachrichten">
          {#if $matrixStore.status === "connecting"}
            <div class="empty-state"><p>Verbinde mit Matrix...</p></div>
          {:else if $matrixStore.status === "error"}
            <div class="empty-state">
              <p class="text-danger">Matrix nicht erreichbar.</p>
              <button class="btn btn-outline" type="button" on:click={() => void startMatrix()}>Erneut verbinden</button>
            </div>
          {:else if !$matrixStore.activeRoomId}
            <div class="empty-state"><p>Raum auswählen.</p></div>
          {:else if activeMessages.length === 0}
            <div class="empty-state"><p>Noch keine Nachrichten.</p></div>
          {:else}
            {#each activeMessages as msg (msg.eventId)}
              {@const isOwn = msg.senderId === myUserId}
              <article class="chat-message" class:own={isOwn}>
                <header class="chat-meta">
                  <div class="avatar-circle">{msg.senderName.charAt(0).toUpperCase()}</div>
                  <div class="chat-meta__text">
                    <strong>{msg.senderName}</strong>
                    <time class="text-muted">{formatTime(msg.timestamp)}</time>
                  </div>
                </header>
                <div class="chat-bubble">
                  {#if msg.msgtype === "m.text"}
                    <p>{msg.body}</p>
                  {:else if msg.msgtype === "m.image" && msg.mxcUrl}
                    <img
                      src={mxcToHttp(msg.mxcUrl, homeserverUrl)}
                      alt={msg.fileName ?? "Bild"}
                      class="chat-image"
                      loading="lazy"
                    />
                  {:else if msg.mxcUrl}
                    <a
                      href={mxcToHttp(msg.mxcUrl, homeserverUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="attachment-link"
                    >
                      📎 {msg.fileName ?? "Anhang"}
                      {#if msg.fileSize}
                        <small>({(msg.fileSize / 1024).toFixed(1)} KB)</small>
                      {/if}
                    </a>
                  {:else}
                    <p>{msg.body}</p>
                  {/if}
                </div>
              </article>
            {/each}
          {/if}
        </div>

        {#if $matrixStore.typing.length > 0}
          <p class="typing-indicator">
            {$matrixStore.typing.join(", ")} tippt...
          </p>
        {/if}

        <form class="chat-composer" on:submit|preventDefault={submit}>
          <textarea
            class="textarea"
            rows="2"
            bind:value={messageInput}
            placeholder="Nachricht… (Enter zum Senden)"
            maxlength="8000"
            disabled={$matrixStore.status !== "ready" || !$matrixStore.activeRoomId || sending}
            on:input={onTypingInput}
            on:keydown={onKeydown}
          ></textarea>
          <div class="chat-composer__actions">
            <button
              class="btn btn-outline"
              type="button"
              title="Datei anhängen"
              disabled={$matrixStore.status !== "ready" || !$matrixStore.activeRoomId}
              on:click={pickFile}
            >📎</button>
            <button
              class="btn btn-primary"
              type="submit"
              disabled={!messageInput.trim() || $matrixStore.status !== "ready" || !$matrixStore.activeRoomId || sending}
            >Senden</button>
          </div>
          <input
            bind:this={fileInput}
            type="file"
            class="sr-only"
            accept="image/*,.pdf,.txt,.md,.docx,.xlsx,.pptx"
            on:change={onFileSelected}
          />
        </form>
      </section>
    </div>
  {/if}
</div>

<!-- New Group Modal -->
{#if showNewGroup}
  <div class="modal-backdrop" on:click|self={() => (showNewGroup = false)} role="presentation">
    <div class="modal glass-panel">
      <h3>Neuer Raum</h3>
      <input
        class="modal-input"
        type="text"
        bind:value={newGroupName}
        placeholder="Raumname"
        autofocus
        on:keydown={(e) => e.key === "Enter" && void handleCreateGroup()}
      />
      <div class="modal-actions">
        <button class="btn btn-outline" on:click={() => (showNewGroup = false)}>Abbrechen</button>
        <button class="btn btn-primary" disabled={!newGroupName.trim() || modalBusy} on:click={handleCreateGroup}>
          {modalBusy ? "Erstelle..." : "Erstellen"}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- New DM Modal -->
{#if showNewDM}
  <div class="modal-backdrop" on:click|self={() => (showNewDM = false)} role="presentation">
    <div class="modal glass-panel">
      <h3>Direktnachricht</h3>
      <p class="modal-hint">Matrix-Benutzername eingeben</p>
      {#if mxUsers.length > 0}
        <div class="user-list">
          {#each mxUsers as u (u.matrix_user_id)}
            <button
              class="user-chip"
              class:selected={newDMTarget === u.matrix_user_id}
              on:click={() => (newDMTarget = u.matrix_user_id)}
            >
              {u.email ?? u.matrix_user_id.split(":")[0].replace("@", "")}
            </button>
          {/each}
        </div>
      {/if}
      <input
        class="modal-input"
        type="text"
        bind:value={newDMTarget}
        placeholder="@benutzername:matrix.uvh.maro.run"
        on:keydown={(e) => e.key === "Enter" && void handleStartDM()}
      />
      <div class="modal-actions">
        <button class="btn btn-outline" on:click={() => (showNewDM = false)}>Abbrechen</button>
        <button class="btn btn-primary" disabled={!newDMTarget.trim() || modalBusy} on:click={handleStartDM}>
          {modalBusy ? "Öffne..." : "Öffnen"}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .chat-wrap {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: var(--space-2);
    align-items: start;
  }

  .chat-sidebar {
    border-radius: 16px;
    padding: 1rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    background: var(--surface-panel);
    backdrop-filter: blur(18px) saturate(130%);
    box-shadow: var(--shadow-elev);
    border: 1px solid var(--border-card);
  }

  .sidebar-section {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .sidebar-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 6px 6px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-secondary);
  }

  .icon-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 1.1rem;
    line-height: 1;
    padding: 0 2px;
    border-radius: 4px;
    transition: color 0.15s, background 0.15s;
  }

  .icon-btn:hover {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }

  .room-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-radius: 8px;
    border: none;
    background: none;
    color: var(--text-primary);
    cursor: pointer;
    text-align: left;
    font-size: 0.88rem;
    transition: background 0.12s;
    width: 100%;
  }

  .room-item:hover {
    background: color-mix(in srgb, var(--accent) 10%, transparent);
  }

  .room-item.active {
    background: color-mix(in srgb, var(--accent) 20%, transparent);
    color: var(--accent);
    font-weight: 600;
  }

  .room-icon {
    font-size: 0.85rem;
    color: var(--text-secondary);
    flex-shrink: 0;
    width: 14px;
  }

  .room-item.active .room-icon {
    color: var(--accent);
  }

  .dm-icon {
    font-style: normal;
  }

  .room-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sidebar-empty {
    padding: 4px 8px;
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .chat-layout {
    display: grid;
    grid-template-rows: auto 1fr auto auto;
    gap: var(--space-1);
    min-height: 72vh;
    border-radius: 18px;
    background: var(--surface-panel);
    backdrop-filter: blur(18px) saturate(130%);
    box-shadow: var(--shadow-elev);
    border: 1px solid var(--border-card);
    padding: var(--space-2);
  }

  .chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: var(--space-1);
    border-bottom: 1px solid var(--border-card);
  }

  .chat-header__info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .room-tag {
    font-size: 1rem;
    color: var(--text-secondary);
    font-weight: 600;
  }

  .chat-header__info h2 {
    margin: 0;
    font-size: 1.1rem;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-secondary);
  }

  .status-dot.online { background: #22c55e; }
  .status-label { font-size: 0.85rem; }

  .chat-thread {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    overflow-y: auto;
    min-height: 42vh;
    max-height: 56vh;
    padding-right: 4px;
    scroll-behavior: smooth;
  }

  .empty-state {
    display: grid;
    place-items: center;
    flex: 1;
    padding: var(--space-2);
    color: var(--text-secondary);
  }

  .chat-message {
    display: grid;
    gap: 6px;
    max-width: 80%;
  }

  .chat-message.own { align-self: flex-end; }

  .chat-meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .chat-meta__text {
    display: grid;
    gap: 2px;
  }

  .avatar-circle {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--accent) 30%, var(--surface-subtle) 70%);
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 0.85rem;
    flex-shrink: 0;
  }

  .chat-bubble {
    border-radius: 16px;
    background: var(--surface-subtle);
    padding: 10px 14px;
    box-shadow: var(--shadow-sm);
    word-break: break-word;
  }

  .chat-message.own .chat-bubble {
    background: color-mix(in srgb, var(--accent) 16%, var(--surface-subtle) 84%);
  }

  .chat-bubble p { margin: 0; white-space: pre-wrap; }

  .chat-image {
    max-width: 300px;
    max-height: 220px;
    border-radius: 10px;
    display: block;
    object-fit: contain;
  }

  .attachment-link {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--accent);
    text-decoration: none;
    font-size: 0.9rem;
  }

  .attachment-link:hover { text-decoration: underline; }

  .typing-indicator {
    margin: 0;
    padding: 4px 0;
    color: var(--text-secondary);
    font-size: 0.85rem;
    font-style: italic;
  }

  .chat-composer {
    display: grid;
    gap: 8px;
    padding: 10px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--surface-subtle) 80%, transparent);
  }

  .chat-composer__actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .sr-only {
    position: absolute;
    width: 1px; height: 1px;
    padding: 0; margin: -1px;
    overflow: hidden;
    clip: rect(0,0,0,0);
    white-space: nowrap;
    border: 0;
  }

  .text-danger { color: var(--danger); }

  /* Modals */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    display: grid;
    place-items: center;
    z-index: 999;
  }

  .modal {
    width: min(420px, 92vw);
    border-radius: 16px;
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: var(--surface-panel);
    border: 1px solid var(--border-card);
    box-shadow: 0 24px 64px rgba(0,0,0,0.5);
  }

  .modal h3 { margin: 0; font-size: 1.1rem; }

  .modal-hint {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .modal-input {
    background: var(--bg-input, #12151f);
    border: 1px solid var(--border, rgba(255,255,255,0.1));
    border-radius: 8px;
    color: inherit;
    padding: 0.6rem 0.9rem;
    font-size: 0.9rem;
    outline: none;
    width: 100%;
    box-sizing: border-box;
  }

  .modal-input:focus { border-color: var(--accent); }

  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .user-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .user-chip {
    padding: 4px 12px;
    border-radius: 99px;
    border: 1px solid var(--border, rgba(255,255,255,0.12));
    background: none;
    color: var(--text-primary);
    cursor: pointer;
    font-size: 0.83rem;
    transition: background 0.12s, border-color 0.12s;
  }

  .user-chip:hover { background: color-mix(in srgb, var(--accent) 12%, transparent); }
  .user-chip.selected { background: color-mix(in srgb, var(--accent) 22%, transparent); border-color: var(--accent); }

  @media (max-width: 680px) {
    .chat-wrap { grid-template-columns: 1fr; }
    .chat-sidebar { display: none; }
  }
</style>
