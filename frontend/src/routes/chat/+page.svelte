<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import Avatar from "$lib/components/Avatar.svelte";
  import { apiFetch } from "$lib/api";
  import { appSettings, refreshAppSettings } from "$lib/app-settings";
  import { authHeader, session } from "$lib/auth";
  import { hasUnsafePattern, sanitizeMultilineText } from "$lib/forms";
  import { pushToast } from "$lib/toast";

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
    client_message_id: string | null;
    has_attachment: boolean;
    sender: {
      username: string;
      display_name: string;
      avatar_url?: string | null;
    };
    attachment: null | {
      id: string;
      file_name: string;
      file_type: string;
      file_size: number;
      download_url: string;
    };
  };

  type ReactionSnapshot = {
    counts: Record<string, Record<string, number>>;
    mine: Record<string, string>;
  };

  type TypingUser = {
    user_id: string;
    username: string;
    display_name: string;
  };

  type UiMessage = ChatMessage & {
    local_id: string;
    send_state: "sending" | "sent" | "failed";
    retry_payload?: {
      content: string;
      client_message_id: string;
      file: File | null;
    };
  };

  let rooms: ChatRoom[] = [];
  let activeRoomId = "";
  let activeRoomName = "";
  let messages: UiMessage[] = [];
  let messageText = "";
  let pendingFile: File | null = null;
  let pendingPreview = "";
  let pendingPreviewType: "image" | "file" = "file";
  let loadingRooms = true;
  let loadingMessages = false;
  let sending = false;
  let error = "";
  let roomError = "";
  let messageError = "";
  let dropActive = false;
  let userAtBottom = true;
  let fileInput: HTMLInputElement | null = null;
  let threadScroller: HTMLDivElement | null = null;
  let reactionsByMessage: Record<string, Record<string, number>> = {};
  let userReactionByMessage: Record<string, string | null> = {};
  let readCountsByMessage: Record<string, number> = {};
  let typingUsers: TypingUser[] = [];
  let streamStatus: "idle" | "connecting" | "connected" | "disconnected" = "idle";
  let retryingMessageId = "";
  let downloadingAttachmentId = "";

  let roomEventSource: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempt = 0;
  let typingHeartbeat: ReturnType<typeof setInterval> | null = null;
  let typingIdleTimer: ReturnType<typeof setTimeout> | null = null;
  let typingPollTimer: ReturnType<typeof setInterval> | null = null;
  let pendingReadTimer: ReturnType<typeof setTimeout> | null = null;
  let currentlyTyping = false;

  const maxFileSize = 10 * 1024 * 1024;
  const reactionOptions = [
    { key: "plus_one", label: "+1" },
    { key: "thanks", label: "Danke" },
    { key: "ok", label: "Okay" },
    { key: "seen", label: "Gesehen" }
  ];

  const createClientMessageId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  };

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
  const activeRoom = () => rooms.find((room) => room.id === activeRoomId) ?? null;
  const pinnedSummary = () => activeRoom()?.last_message_preview?.trim() || "Keine angeheftete Nachricht";

  const isNearBottom = () => {
    if (!threadScroller) return true;
    const threshold = 80;
    const distance = threadScroller.scrollHeight - threadScroller.scrollTop - threadScroller.clientHeight;
    return distance <= threshold;
  };

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
      userAtBottom = true;
    }
  };

  const toUiMessage = (message: ChatMessage, state: UiMessage["send_state"] = "sent"): UiMessage => ({
    ...message,
    local_id: message.id,
    send_state: state
  });

  const sortMessages = (items: UiMessage[]) =>
    [...items].sort((a, b) => {
      const left = new Date(a.created_at).getTime();
      const right = new Date(b.created_at).getTime();
      if (left !== right) return left - right;
      return a.local_id.localeCompare(b.local_id);
    });

  const mergeServerMessage = async (incoming: ChatMessage) => {
    const existing = messages.findIndex(
      (item) =>
        item.id === incoming.id ||
        (incoming.client_message_id && item.client_message_id && item.client_message_id === incoming.client_message_id)
    );

    if (existing >= 0) {
      const previous = messages[existing];
      const next = [...messages];
      next[existing] = {
        ...toUiMessage(incoming, "sent"),
        local_id: previous.local_id
      };
      messages = sortMessages(next);
    } else {
      messages = sortMessages([...messages, toUiMessage(incoming, "sent")]);
    }

    const shouldAutoScroll = userAtBottom || isNearBottom();
    if (shouldAutoScroll) {
      await scrollToBottom();
      scheduleMarkRead();
    }
  };

  const loadReactions = async (roomId: string) => {
    const snapshot = await apiFetch<ReactionSnapshot>(`/api/chat/rooms/${roomId}/reactions`, { toastOnError: false });
    reactionsByMessage = snapshot.counts ?? {};
    userReactionByMessage = Object.fromEntries(
      Object.entries(snapshot.mine ?? {}).map(([messageId, reaction]) => [messageId, reaction || null])
    );
  };

  const loadReadReceipts = async (roomId: string) => {
    const snapshot = await apiFetch<{ counts: Record<string, number> }>(`/api/chat/rooms/${roomId}/read-receipts`, {
      toastOnError: false
    });
    readCountsByMessage = snapshot.counts ?? {};
  };

  const loadTypingUsers = async (roomId: string) => {
    const snapshot = await apiFetch<{ users: TypingUser[] }>(`/api/chat/rooms/${roomId}/typing`, { toastOnError: false });
    typingUsers = snapshot.users ?? [];
  };

  const stopRoomStream = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (roomEventSource) {
      roomEventSource.close();
      roomEventSource = null;
    }
    streamStatus = "idle";
  };

  const startRoomStream = (roomId: string) => {
    stopRoomStream();
    if (!roomId) return;

    streamStatus = "connecting";
    const source = new EventSource(`/api/chat/rooms/${roomId}/stream`);
    roomEventSource = source;

    source.addEventListener("open", () => {
      reconnectAttempt = 0;
      streamStatus = "connected";
    });

    source.addEventListener("message-created", async (event) => {
      try {
        const parsed = JSON.parse((event as MessageEvent<string>).data) as ChatMessage;
        await mergeServerMessage(parsed);
        await loadReadReceipts(roomId);
      } catch {
        roomError = "Neue Nachricht konnte nicht synchronisiert werden.";
      }
    });

    source.addEventListener("reaction-updated", async (event) => {
      try {
        const parsed = JSON.parse((event as MessageEvent<string>).data) as {
          message_id: string;
          counts: Record<string, number>;
          mine: string | null;
          user_id?: string;
        };
        reactionsByMessage = { ...reactionsByMessage, [parsed.message_id]: parsed.counts ?? {} };
        if (parsed.user_id && parsed.user_id === $session?.id) {
          userReactionByMessage = { ...userReactionByMessage, [parsed.message_id]: parsed.mine ?? null };
        } else if (!parsed.user_id) {
          await loadReactions(roomId);
        }
      } catch {
        roomError = "Reaktionen konnten nicht synchronisiert werden.";
      }
    });

    source.addEventListener("read-updated", async () => {
      try {
        await loadReadReceipts(roomId);
      } catch {
        roomError = "Lesebestatigung konnte nicht synchronisiert werden.";
      }
    });

    source.addEventListener("typing-updated", (event) => {
      try {
        const parsed = JSON.parse((event as MessageEvent<string>).data) as { users?: TypingUser[] };
        typingUsers = parsed.users ?? [];
      } catch {
        roomError = "Tippen-Status konnte nicht synchronisiert werden.";
      }
    });

    source.addEventListener("error", () => {
      if (roomEventSource !== source) return;
      streamStatus = "disconnected";
      source.close();
      roomEventSource = null;

      reconnectAttempt += 1;
      const delay = Math.min(15000, 1000 * 2 ** Math.min(reconnectAttempt, 4));
      reconnectTimer = setTimeout(() => {
        if (activeRoomId === roomId) {
          startRoomStream(roomId);
        }
      }, delay);
    });
  };

  const stopTyping = async (notifyServer = true) => {
    if (typingIdleTimer) {
      clearTimeout(typingIdleTimer);
      typingIdleTimer = null;
    }
    if (typingHeartbeat) {
      clearInterval(typingHeartbeat);
      typingHeartbeat = null;
    }

    if (!currentlyTyping) return;
    currentlyTyping = false;

    if (notifyServer && activeRoomId) {
      try {
        await apiFetch(`/api/chat/rooms/${activeRoomId}/typing`, {
          method: "POST",
          body: JSON.stringify({ typing: false }),
          toastOnError: false
        });
      } catch {
        // best effort
      }
    }
  };

  const startTyping = async () => {
    if (!activeRoomId || !messageText.trim()) {
      await stopTyping(true);
      return;
    }

    if (!currentlyTyping) {
      currentlyTyping = true;
      try {
        await apiFetch(`/api/chat/rooms/${activeRoomId}/typing`, {
          method: "POST",
          body: JSON.stringify({ typing: true }),
          toastOnError: false
        });
      } catch {
        // best effort
      }
    }

    if (typingHeartbeat) {
      clearInterval(typingHeartbeat);
    }
    typingHeartbeat = setInterval(() => {
      if (!activeRoomId || !currentlyTyping) return;
      apiFetch(`/api/chat/rooms/${activeRoomId}/typing`, {
        method: "POST",
        body: JSON.stringify({ typing: true }),
        toastOnError: false
      }).catch(() => {
        // best effort
      });
    }, 2500);

    if (typingIdleTimer) {
      clearTimeout(typingIdleTimer);
    }
    typingIdleTimer = setTimeout(() => {
      stopTyping(true).catch(() => {
        // best effort
      });
    }, 3000);
  };

  const scheduleMarkRead = () => {
    if (!activeRoomId) return;
    if (pendingReadTimer) {
      clearTimeout(pendingReadTimer);
    }
    pendingReadTimer = setTimeout(() => {
      markLatestAsRead().catch(() => {
        // best effort
      });
    }, 500);
  };

  const markLatestAsRead = async () => {
    if (!activeRoomId || !messages.length) return;
    const latest = [...messages].reverse().find((item) => item.send_state === "sent");
    if (!latest) return;
    await apiFetch(`/api/chat/rooms/${activeRoomId}/read`, {
      method: "POST",
      body: JSON.stringify({ last_read_message_id: latest.id }),
      toastOnError: false
    });
    await loadReadReceipts(activeRoomId);
  };

  const openRoom = async (roomId: string) => {
    loadingMessages = true;
    roomError = "";
    await stopTyping(true);
    stopRoomStream();
    if (typingPollTimer) {
      clearInterval(typingPollTimer);
      typingPollTimer = null;
    }

    try {
      const [result, reactionsSnapshot, readSnapshot, typingSnapshot] = await Promise.all([
        apiFetch<{ room: ChatRoom; messages: ChatMessage[] }>(`/api/chat/rooms/${roomId}/messages`),
        apiFetch<ReactionSnapshot>(`/api/chat/rooms/${roomId}/reactions`, { toastOnError: false }),
        apiFetch<{ counts: Record<string, number> }>(`/api/chat/rooms/${roomId}/read-receipts`, { toastOnError: false }),
        apiFetch<{ users: TypingUser[] }>(`/api/chat/rooms/${roomId}/typing`, { toastOnError: false })
      ]);
      activeRoomId = result.room.id;
      activeRoomName = result.room.name;
      messages = result.messages.map((message) => toUiMessage(message, "sent"));
      reactionsByMessage = reactionsSnapshot.counts ?? {};
      userReactionByMessage = Object.fromEntries(
        Object.entries(reactionsSnapshot.mine ?? {}).map(([messageId, reaction]) => [messageId, reaction || null])
      );
      readCountsByMessage = readSnapshot.counts ?? {};
      typingUsers = typingSnapshot.users ?? [];
      await scrollToBottom();
      scheduleMarkRead();
      startRoomStream(result.room.id);
      typingPollTimer = setInterval(() => {
        loadTypingUsers(result.room.id).catch(() => {
          // best effort
        });
      }, 8000);
    } catch (err) {
      roomError = err instanceof Error ? err.message : "Nachrichten konnten nicht geladen werden.";
      messages = [];
      reactionsByMessage = {};
      userReactionByMessage = {};
      readCountsByMessage = {};
      typingUsers = [];
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

      rooms = await apiFetch<ChatRoom[]>("/api/chat/rooms");
      if (rooms.length > 0) {
        await openRoom(rooms.some((room) => room.id === activeRoomId) ? activeRoomId : rooms[0].id);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Chat konnte nicht geladen werden.";
    } finally {
      loadingRooms = false;
    }
  };

  const createOptimisticMessage = (
    roomId: string,
    content: string,
    clientMessageId: string,
    attachmentFile: File | null
  ): UiMessage => ({
    id: `temp-${clientMessageId}`,
    local_id: `temp-${clientMessageId}`,
    room_id: roomId,
    user_id: $session?.id || "",
    content,
    created_at: new Date().toISOString(),
    client_message_id: clientMessageId,
    has_attachment: Boolean(attachmentFile),
    sender: {
      username: $session?.username || "Ich",
      display_name: $session?.username || "Ich",
      avatar_url: $session?.avatarUrl ?? null
    },
    attachment: attachmentFile
      ? {
          id: `local-${clientMessageId}`,
          file_name: attachmentFile.name,
          file_type: attachmentFile.type || "application/octet-stream",
          file_size: attachmentFile.size,
          download_url: ""
        }
      : null,
    send_state: "sending",
    retry_payload: {
      content,
      client_message_id: clientMessageId,
      file: attachmentFile
    }
  });

  const submitMessage = async (input: { content: string; clientMessageId: string; file: File | null }, localId: string) => {
    const formData = new FormData();
    formData.append("content", input.content);
    formData.append("client_message_id", input.clientMessageId);
    if (input.file) {
      formData.append("attachment", input.file);
    }

    try {
      const created = await apiFetch<ChatMessage>(`/api/chat/rooms/${activeRoomId}/messages`, {
        method: "POST",
        body: formData
      });
      await mergeServerMessage(created);
      rooms = rooms.map((room) =>
        room.id === activeRoomId
          ? {
              ...room,
              message_count: Math.max(room.message_count, messages.filter((item) => item.send_state === "sent").length),
              last_message_at: created.created_at,
              last_message_preview: created.content?.trim() || created.attachment?.file_name || "Anhang"
            }
          : room
      );
      pushToast("Nachricht gesendet.", "success", 1800);
      return true;
    } catch (err) {
      messages = messages.map((message) =>
        message.local_id === localId
          ? {
              ...message,
              send_state: "failed"
            }
          : message
      );
      roomError = err instanceof Error ? err.message : "Nachricht konnte nicht gesendet werden.";
      pushToast(roomError, "error");
      return false;
    }
  };

  const sendMessage = async () => {
    if (!activeRoomId || sending) return;

    const trimmed = sanitizeMultilineText(messageText, 4000);
    messageError = "";
    if (!trimmed && !pendingFile) {
      messageError = "Nachricht oder Anhang erforderlich.";
      roomError = messageError;
      return;
    }
    if (hasUnsafePattern(trimmed)) {
      messageError = "Ungultige Zeichenfolge.";
      roomError = messageError;
      return;
    }

    sending = true;
    roomError = "";
    const shouldAutoScroll = userAtBottom || isNearBottom();
    const fileToSend = pendingFile;
    const clientMessageId = createClientMessageId();
    const optimistic = createOptimisticMessage(activeRoomId, trimmed, clientMessageId, fileToSend);
    messages = sortMessages([...messages, optimistic]);

    try {
      const ok = await submitMessage(
        {
          content: trimmed,
          clientMessageId,
          file: fileToSend
        },
        optimistic.local_id
      );
      messageText = "";
      clearPendingFile();
      await stopTyping(true);
      if (!ok) return;
      if (shouldAutoScroll) {
        await scrollToBottom();
      }
      scheduleMarkRead();
    } catch (err) {
      roomError = err instanceof Error ? err.message : "Nachricht konnte nicht gesendet werden.";
      pushToast(roomError, "error");
    } finally {
      sending = false;
    }
  };

  const retryMessage = async (message: UiMessage) => {
    if (!message.retry_payload || !activeRoomId) return;
    if (retryingMessageId === message.local_id) return;
    retryingMessageId = message.local_id;
    roomError = "";

    messages = messages.map((entry) =>
      entry.local_id === message.local_id
        ? {
            ...entry,
            send_state: "sending"
          }
        : entry
    );

    const ok = await submitMessage(
      {
        content: message.retry_payload.content,
        clientMessageId: message.retry_payload.client_message_id,
        file: message.retry_payload.file
      },
      message.local_id
    );

    if (ok) {
      scheduleMarkRead();
    }
    retryingMessageId = "";
  };

  const toggleReaction = async (messageId: string, reactionKey: string) => {
    const previousReaction = userReactionByMessage[messageId];
    const nextReaction = previousReaction === reactionKey ? null : reactionKey;
    const current = reactionsByMessage[messageId] ?? {};
    const updated: Record<string, number> = { ...current };

    if (previousReaction) {
      updated[previousReaction] = Math.max(0, (updated[previousReaction] ?? 1) - 1);
    }
    if (nextReaction) {
      updated[nextReaction] = (updated[nextReaction] ?? 0) + 1;
    }

    reactionsByMessage = { ...reactionsByMessage, [messageId]: updated };
    userReactionByMessage = { ...userReactionByMessage, [messageId]: nextReaction };

    try {
      const response = await apiFetch<{ message_id: string; counts: Record<string, number>; mine: string | null }>(
        `/api/chat/messages/${messageId}/reaction`,
        {
          method: "POST",
          body: JSON.stringify({ reaction: nextReaction }),
          toastOnError: false
        }
      );
      reactionsByMessage = { ...reactionsByMessage, [response.message_id]: response.counts ?? {} };
      userReactionByMessage = { ...userReactionByMessage, [response.message_id]: response.mine ?? null };
    } catch (err) {
      reactionsByMessage = { ...reactionsByMessage, [messageId]: current };
      userReactionByMessage = { ...userReactionByMessage, [messageId]: previousReaction ?? null };
      roomError = err instanceof Error ? err.message : "Reaktion konnte nicht gespeichert werden.";
      pushToast(roomError, "error");
    }
  };

  const reactionCount = (messageId: string, reactionKey: string) => reactionsByMessage[messageId]?.[reactionKey] ?? 0;

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    dropActive = false;
    applyPendingFile(event.dataTransfer?.files?.[0] ?? null);
  };

  const handleThreadScroll = () => {
    userAtBottom = isNearBottom();
    if (userAtBottom) {
      scheduleMarkRead();
    }
  };

  const typingSummary = () => {
    if (typingUsers.length === 0) return "";
    if (typingUsers.length === 1) {
      const user = typingUsers[0];
      return `${user.display_name || user.username} tippt...`;
    }
    return `${typingUsers.length} Personen tippen...`;
  };

  const downloadAttachment = async (message: UiMessage) => {
    if (!message.attachment?.download_url) return;
    downloadingAttachmentId = message.attachment.id;
    roomError = "";
    try {
      const response = await fetch(message.attachment.download_url, {
        method: "GET",
        headers: authHeader(),
        credentials: "include"
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Download nicht moglich.");
      }
      const blob = await response.blob();
      const safeName = message.attachment.file_name.replace(/[\\/:*?"<>|]+/g, "_");
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = safeName || "chat-anhang";
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      roomError = err instanceof Error ? err.message : "Download fehlgeschlagen.";
      pushToast(roomError, "error");
    } finally {
      downloadingAttachmentId = "";
    }
  };

  onMount(() => {
    loadRooms();
  });

  onDestroy(() => {
    clearPendingFile();
    stopRoomStream();
    stopTyping(false).catch(() => {
      // best effort
    });
    if (typingPollTimer) {
      clearInterval(typingPollTimer);
      typingPollTimer = null;
    }
    if (pendingReadTimer) {
      clearTimeout(pendingReadTimer);
      pendingReadTimer = null;
    }
  });
</script>

<div class="page-stack">
  <section class="page-intro">
    <h1 class="page-title">Chat</h1>
  </section>

  {#if !$session}
    <Card title="Nicht verfugbar">
      <p class="text-muted">Anmeldung erforderlich.</p>
    </Card>
  {:else if !$appSettings.chatEnabled}
    <Card title="Chat ist deaktiviert">
      <p class="text-muted">Deaktiviert.</p>
    </Card>
  {:else}
    <section class="chat-shell">
      <Card title="Raume">
        {#if loadingRooms}
          <p class="text-muted">Laden...</p>
        {:else if error}
          <p class="status-banner error">{error}</p>
        {:else}
          <div class="chat-room-strip" role="tablist" aria-label="Chatraume">
            {#each rooms as room}
              <button
                class:active={room.id === activeRoomId}
                class="chat-room-chip"
                type="button"
                role="tab"
                aria-selected={room.id === activeRoomId}
                on:click={() => openRoom(room.id)}
              >
                <span class="chat-room-chip__name">{room.name}</span>
                <span class="chat-room-chip__count">{room.message_count}</span>
              </button>
            {/each}
          </div>
        {/if}
      </Card>

      <section class="chat-panel surface-card">
        <header class="chat-panel__header">
          <div class="chat-panel__title">
            <h2 class="section-title">{activeRoomName || "Nachrichten"}</h2>
            <span class="text-muted">
              {#if streamStatus === "connected"}
                Live
              {:else if streamStatus === "connecting"}
                Verbinden...
              {:else if streamStatus === "disconnected"}
                Verbindung verloren, erneuter Versuch...
              {/if}
            </span>
          </div>
          <span class="badge badge-secondary">{messages.length}</span>
        </header>

        {#if roomError}
          <p class="status-banner error">{roomError}</p>
        {/if}

        <div class="chat-pinned" role="note" aria-label="Angeheftete Information">
          <span class="chat-pinned__label">Angeheftet</span>
          <p>{pinnedSummary()}</p>
        </div>

        {#if typingUsers.length > 0}
          <p class="chat-typing-indicator">{typingSummary()}</p>
        {/if}

        <div
          bind:this={threadScroller}
          class="chat-thread"
          role="log"
          aria-label="Chatverlauf"
          on:scroll={handleThreadScroll}
          on:dragover|preventDefault={() => (dropActive = true)}
          on:dragleave={() => (dropActive = false)}
          on:drop={handleDrop}
        >
          {#if loadingMessages}
            <p class="text-muted">Laden...</p>
          {:else if messages.length === 0}
            <div class="empty-state">
              <p>Keine Nachrichten.</p>
            </div>
          {:else}
            {#each messages as message (message.local_id)}
              <article class:own={isOwnMessage(message)} class="chat-message">
                <header class="chat-message__meta">
                  <Avatar
                    name={message.sender.display_name || message.sender.username}
                    avatarUrl={message.sender.avatar_url ?? null}
                    size={40}
                  />
                  <strong>{message.sender.display_name || message.sender.username}</strong>
                  <time datetime={message.created_at}>{formatTime(message.created_at)}</time>
                </header>

                <div class="chat-bubble">
                  {#if message.content}
                    <p class="chat-bubble__text">{message.content}</p>
                  {/if}

                  {#if message.attachment}
                    <button
                      type="button"
                      class="chat-attachment"
                      disabled={!message.attachment.download_url || downloadingAttachmentId === message.attachment.id}
                      on:click={() => downloadAttachment(message)}
                    >
                      <span class="chat-attachment__name">{message.attachment.file_name}</span>
                      <span class="chat-attachment__meta">
                        {message.attachment.file_type} - {formatBytes(message.attachment.file_size)}
                      </span>
                    </button>
                  {/if}
                </div>

                <div class="chat-message__state">
                  {#if message.send_state === "sending"}
                    <span class="text-muted">Wird gesendet...</span>
                  {:else if message.send_state === "failed"}
                    <span class="status-banner error">Senden fehlgeschlagen.</span>
                    <button
                      class="btn btn-outline"
                      type="button"
                      disabled={retryingMessageId === message.local_id}
                      on:click={() => retryMessage(message)}
                    >
                      {#if retryingMessageId === message.local_id}
                        <span class="btn-spinner" aria-hidden="true"></span>
                      {/if}
                      Erneut senden
                    </button>
                  {/if}
                  {#if isOwnMessage(message) && message.send_state === "sent"}
                    <span class="text-muted">Gelesen von {readCountsByMessage[message.id] ?? 0}</span>
                  {/if}
                </div>

                <div class="chat-reaction-bar" role="group" aria-label="Reaktionen">
                  {#each reactionOptions as reaction}
                    <button
                      class:active={userReactionByMessage[message.id] === reaction.key}
                      class="chat-reaction"
                      type="button"
                      on:click={() => toggleReaction(message.id, reaction.key)}
                    >
                      <span>{reaction.label}</span>
                      {#if reactionCount(message.id, reaction.key) > 0}
                        <small>{reactionCount(message.id, reaction.key)}</small>
                      {/if}
                    </button>
                  {/each}
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

        <form class="chat-composer" on:submit|preventDefault={sendMessage}>
          <textarea
            class="textarea"
            class:input-invalid={Boolean(messageError)}
            rows="3"
            bind:value={messageText}
            placeholder="Nachricht schreiben..."
            aria-label="Nachricht"
            maxlength="4000"
            on:input={startTyping}
            on:blur={() => stopTyping(true)}
          ></textarea>
          {#if messageError}
            <p class="field-error">{messageError}</p>
          {/if}

          <div class="chat-composer__actions">
            <input
              bind:this={fileInput}
              class="chat-file-input"
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,.txt,.md,.docx,.xlsx,.pptx"
              on:change={(event) => applyPendingFile((event.currentTarget as HTMLInputElement).files?.[0] ?? null)}
            />
            <button class="btn btn-outline" type="button" on:click={() => fileInput?.click()}>Datei auswahlen</button>
            <button class="btn btn-primary" type="submit" disabled={sending}>
              {#if sending}
                <span class="btn-spinner" aria-hidden="true"></span>
              {/if}
              {sending ? "Senden..." : "Senden"}
            </button>
          </div>
        </form>
      </section>
    </section>
  {/if}
</div>
