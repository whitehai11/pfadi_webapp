<script lang="ts">
  import { onMount, tick } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import { apiFetch } from "$lib/api";
  import { appSettings, refreshAppSettings } from "$lib/app-settings";
  import { session } from "$lib/auth";

  type ChatRoom = {
    id: string;
    name: string;
    created_at: string;
    message_count: number;
    last_message_at: string | null;
    last_message_preview: string | null;
  };

  type ChatMessage = {
    id: string;
    room_id: string;
    user_id: string;
    content: string;
    created_at: string;
    has_attachment: boolean;
    sender: {
      username: string;
      display_name: string;
    };
    attachment: null | {
      id: string;
      file_name: string;
      file_type: string;
      file_size: number;
      download_url: string;
    };
  };

  let rooms: ChatRoom[] = [];
  let activeRoomId = "";
  let activeRoomName = "";
  let messages: ChatMessage[] = [];
  let messageText = "";
  let pendingFile: File | null = null;
  let pendingPreview = "";
  let pendingPreviewType: "image" | "file" = "file";
  let loadingRooms = true;
  let loadingMessages = false;
  let sending = false;
  let error = "";
  let roomError = "";
  let dropActive = false;
  let fileInput: HTMLInputElement | null = null;
  let threadScroller: HTMLDivElement | null = null;

  const maxFileSize = 10 * 1024 * 1024;

  const formatTime = (value: string) =>
    new Date(value).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });

  const formatBytes = (value: number) => {
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isOwnMessage = (message: ChatMessage) => message.user_id === $session?.id;

  const clearPendingFile = () => {
    if (pendingPreview) {
      URL.revokeObjectURL(pendingPreview);
    }
    pendingFile = null;
    pendingPreview = "";
    pendingPreviewType = "file";
    if (fileInput) fileInput.value = "";
  };

  const applyPendingFile = (file: File | null) => {
    roomError = "";
    clearPendingFile();

    if (!file) return;
    if (file.size > maxFileSize) {
      roomError = "Datei ist zu gross. Maximal 10 MB sind erlaubt.";
      return;
    }

    pendingFile = file;
    if (file.type.startsWith("image/")) {
      pendingPreview = URL.createObjectURL(file);
      pendingPreviewType = "image";
    }
  };

  const scrollToBottom = async () => {
    await tick();
    if (threadScroller) {
      threadScroller.scrollTop = threadScroller.scrollHeight;
    }
  };

  const openRoom = async (roomId: string) => {
    loadingMessages = true;
    roomError = "";

    try {
      const result = await apiFetch(`/api/chat/rooms/${roomId}/messages`);
      activeRoomId = result.room.id;
      activeRoomName = result.room.name;
      messages = result.messages;
      await scrollToBottom();
    } catch (err) {
      roomError = err instanceof Error ? err.message : "Nachrichten konnten nicht geladen werden.";
    } finally {
      loadingMessages = false;
    }
  };

  const loadRooms = async () => {
    loadingRooms = true;
    error = "";

    try {
      const flags = await refreshAppSettings();
      if (!flags.chatEnabled) {
        rooms = [];
        messages = [];
        activeRoomId = "";
        activeRoomName = "";
        return;
      }

      rooms = await apiFetch("/api/chat/rooms");
      if (rooms.length > 0) {
        await openRoom(rooms.some((room) => room.id === activeRoomId) ? activeRoomId : rooms[0].id);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Chat konnte nicht geladen werden.";
    } finally {
      loadingRooms = false;
    }
  };

  const sendMessage = async () => {
    if (!activeRoomId || sending) return;

    const trimmed = messageText.trim();
    if (!trimmed && !pendingFile) {
      roomError = "Bitte Nachricht oder Anhang senden.";
      return;
    }

    sending = true;
    roomError = "";

    try {
      const formData = new FormData();
      formData.append("content", trimmed);
      if (pendingFile) {
        formData.append("attachment", pendingFile);
      }

      const created = await apiFetch(`/api/chat/rooms/${activeRoomId}/messages`, {
        method: "POST",
        body: formData
      });

      messages = [...messages, created];
      rooms = rooms.map((room) =>
        room.id === activeRoomId
          ? {
              ...room,
              message_count: room.message_count + 1,
              last_message_at: created.created_at,
              last_message_preview: created.content?.trim() || created.attachment?.file_name || "Anhang"
            }
          : room
      );
      messageText = "";
      clearPendingFile();
      await scrollToBottom();
    } catch (err) {
      roomError = err instanceof Error ? err.message : "Nachricht konnte nicht gesendet werden.";
    } finally {
      sending = false;
    }
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    dropActive = false;
    applyPendingFile(event.dataTransfer?.files?.[0] ?? null);
  };

  onMount(() => {
    loadRooms();

    return () => {
      clearPendingFile();
    };
  });
</script>

<div class="page-stack">
  <section class="page-intro">
    <p class="page-kicker">Chat</p>
    <h1 class="page-title">Interne Gesprache an einem ruhigen Ort.</h1>
    <p class="page-description">Nur freigegebene Mitglieder sehen diesen Bereich. Nachrichten bleiben schlicht, direkt und gut lesbar.</p>
  </section>

  {#if !$session}
    <Card title="Nicht verfugbar">
      <p class="text-muted">Bitte zuerst anmelden.</p>
    </Card>
  {:else if !$appSettings.chatEnabled}
    <Card title="Chat ist deaktiviert">
      <p class="text-muted">Ein Admin kann den Chat unter Funktionen aktivieren.</p>
    </Card>
  {:else}
    <section class="chat-layout">
      <Card title="Raume">
        {#if loadingRooms}
          <p class="text-muted">Chatraume werden geladen...</p>
        {:else if error}
          <p class="status-banner error">{error}</p>
        {:else}
          <div class="chat-room-list">
            {#each rooms as room}
              <button
                class:active={room.id === activeRoomId}
                class="chat-room-item"
                type="button"
                on:click={() => openRoom(room.id)}
              >
                <span class="chat-room-item__copy">
                  <strong>{room.name}</strong>
                  <small>{room.last_message_preview || "Noch keine Nachrichten."}</small>
                </span>
                <span class="badge badge-secondary">{room.message_count}</span>
              </button>
            {/each}
          </div>
        {/if}
      </Card>

      <Card title={activeRoomName || "Nachrichten"}>
        {#if roomError}
          <p class="status-banner error">{roomError}</p>
        {/if}

        <div
          bind:this={threadScroller}
          class="chat-thread"
          role="log"
          aria-label="Chatverlauf"
          on:dragover|preventDefault={() => (dropActive = true)}
          on:dragleave={() => (dropActive = false)}
          on:drop={handleDrop}
        >
          {#if loadingMessages}
            <p class="text-muted">Nachrichten werden geladen...</p>
          {:else if messages.length === 0}
            <div class="empty-state">
              <p>Dieser Raum ist noch leer.</p>
              <p class="text-muted">Schreib die erste Nachricht oder teile einen Anhang.</p>
            </div>
          {:else}
            {#each messages as message}
              <article class:own={isOwnMessage(message)} class="chat-message">
                <div class="chat-message__meta">
                  <span class="chat-avatar" aria-hidden="true">
                    {(message.sender.display_name || message.sender.username).slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <strong>{message.sender.display_name || message.sender.username}</strong>
                    <small>{formatTime(message.created_at)}</small>
                  </div>
                </div>

                <div class="chat-bubble">
                  {#if message.content}
                    <p class="chat-bubble__text">{message.content}</p>
                  {/if}

                  {#if message.attachment}
                    <a class="chat-attachment" href={message.attachment.download_url} target="_blank" rel="noreferrer">
                      <span class="chat-attachment__name">{message.attachment.file_name}</span>
                      <span class="chat-attachment__meta">
                        {message.attachment.file_type} - {formatBytes(message.attachment.file_size)}
                      </span>
                    </a>
                  {/if}
                </div>
              </article>
            {/each}
          {/if}

          {#if dropActive}
            <div class="chat-dropzone">Datei hier ablegen</div>
          {/if}
        </div>

        {#if pendingFile}
          <div class="chat-preview">
            <div class="chat-preview__meta">
              <strong>{pendingFile.name}</strong>
              <span class="text-muted">{formatBytes(pendingFile.size)}</span>
            </div>
            {#if pendingPreview && pendingPreviewType === "image"}
              <img class="chat-preview__image" src={pendingPreview} alt="Vorschau des ausgewahlten Anhangs" />
            {/if}
            <button class="btn btn-outline" type="button" on:click={clearPendingFile}>Anhang entfernen</button>
          </div>
        {/if}

        <div class="chat-composer">
          <textarea class="textarea" rows="3" bind:value={messageText} placeholder="Nachricht schreiben..."></textarea>

          <div class="chat-composer__actions">
            <input
              bind:this={fileInput}
              class="chat-file-input"
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,.txt,.md,.docx,.xlsx,.pptx"
              on:change={(event) => applyPendingFile((event.currentTarget as HTMLInputElement).files?.[0] ?? null)}
            />
            <button class="btn btn-outline" type="button" on:click={() => fileInput?.click()}>Datei auswahlen</button>
            <button class="btn btn-primary" type="button" disabled={sending} on:click={sendMessage}>
              {sending ? "Senden..." : "Senden"}
            </button>
          </div>
        </div>
      </Card>
    </section>
  {/if}
</div>
