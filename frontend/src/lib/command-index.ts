// engineered by Maro Elias Goth
import { writable } from "svelte/store";
import { apiFetch } from "$lib/api";

export type CommandEntry = {
  id: string;
  type: "quick" | "page" | "entity";
  group: "Aktionen" | "Seiten" | "Nutzer" | "Termine" | "Boxen" | "Chats";
  title: string;
  subtitle: string;
  href: string;
  keywords: string;
};

type CommandIndexState = {
  loading: boolean;
  loadedAt: number;
  items: CommandEntry[];
};

const initialState: CommandIndexState = {
  loading: false,
  loadedAt: 0,
  items: []
};

export const commandIndex = writable<CommandIndexState>(initialState);

const normalize = (value: string | null | undefined) => (value || "").trim();

const createQuickEntries = (isAdmin: boolean): CommandEntry[] => {
  const quick: CommandEntry[] = [
    {
      id: "quick:new-event",
      type: "quick",
      group: "Aktionen",
      title: "New Event",
      subtitle: "Kalender: neuen Termin erstellen",
      href: "/calendar#new-event-form",
      keywords: "new event neuer termin kalender"
    },
    {
      id: "quick:new-box",
      type: "quick",
      group: "Aktionen",
      title: "New Box",
      subtitle: "Material: neue Box erstellen",
      href: "/inventory#new-box-form",
      keywords: "new box neue box material"
    },
    {
      id: "quick:create-task",
      type: "quick",
      group: "Aktionen",
      title: "Create Task",
      subtitle: "Packlisten öffnen",
      href: "/packlists",
      keywords: "create task aufgabe packliste packlisten"
    }
  ];

  if (isAdmin) {
    quick.push({
      id: "quick:send-push",
      type: "quick",
      group: "Aktionen",
      title: "Send Push",
      subtitle: "Admin: Push-Regeln öffnen",
      href: "/admin#push-rules",
      keywords: "send push push senden admin"
    });
  }

  return quick;
};

const createPageEntries = (isAdmin: boolean): CommandEntry[] => {
  const base: CommandEntry[] = [
    {
      id: "page:overview",
      type: "page",
      group: "Seiten",
      title: "Übersicht",
      subtitle: "Startseite",
      href: "/",
      keywords: "übersicht dashboard startseite"
    },
    {
      id: "page:calendar",
      type: "page",
      group: "Seiten",
      title: "Kalender",
      subtitle: "Termine",
      href: "/calendar",
      keywords: "kalender termine event"
    },
    {
      id: "page:inventory",
      type: "page",
      group: "Seiten",
      title: "Material",
      subtitle: "Boxen und Bestand",
      href: "/inventory",
      keywords: "material inventar boxen"
    },
    {
      id: "page:chat",
      type: "page",
      group: "Seiten",
      title: "Chat",
      subtitle: "Räume und Nachrichten",
      href: "/chat",
      keywords: "chat raum nachrichten"
    },
    {
      id: "page:packlists",
      type: "page",
      group: "Seiten",
      title: "Packlisten",
      subtitle: "Packlisten je Termin",
      href: "/packlists",
      keywords: "packliste packlisten task aufgaben"
    },
    {
      id: "page:settings",
      type: "page",
      group: "Seiten",
      title: "Einstellungen",
      subtitle: "Systemstatus und Push",
      href: "/settings",
      keywords: "einstellungen settings system"
    }
  ];

  if (isAdmin) {
    base.push({
      id: "page:admin",
      type: "page",
      group: "Seiten",
      title: "Admin",
      subtitle: "Benutzer und Push-Regeln",
      href: "/admin",
      keywords: "admin benutzer push regeln"
    });
  }

  return base;
};

export const loadCommandIndex = async (options: { isAdmin: boolean; force?: boolean }) => {
  let shouldLoad = true;
  commandIndex.update((state) => {
    if (!options.force && state.loading) {
      shouldLoad = false;
      return state;
    }
    const fresh = Date.now() - state.loadedAt < 60_000;
    if (!options.force && fresh && state.items.length > 0) {
      shouldLoad = false;
      return state;
    }
    return { ...state, loading: true };
  });
  if (!shouldLoad) return;

  const [events, boxes, chats, users] = await Promise.all([
    apiFetch<any[]>("/api/calendar", { toastOnError: false }).catch(() => []),
    apiFetch<any[]>("/api/boxes", { toastOnError: false }).catch(() => []),
    apiFetch<any[]>("/api/chat/rooms", { toastOnError: false }).catch(() => []),
    options.isAdmin
      ? apiFetch<any[]>("/api/admin/users?role=all", { toastOnError: false }).catch(() => [])
      : Promise.resolve([])
  ]);

  const items: CommandEntry[] = [
    ...createQuickEntries(options.isAdmin),
    ...createPageEntries(options.isAdmin),
    ...users.map((user) => ({
      id: `user:${user.id}`,
      type: "entity" as const,
      group: "Nutzer" as const,
      title: normalize(user.email) || "Nutzer",
      subtitle: `${normalize(user.role)} · ${normalize(user.status)}`,
      href: `/admin?user=${encodeURIComponent(user.id)}`,
      keywords: `${normalize(user.email)} ${normalize(user.role)} ${normalize(user.status)}`.toLowerCase()
    })),
    ...events.map((event) => ({
      id: `event:${event.id}`,
      type: "entity" as const,
      group: "Termine" as const,
      title: normalize(event.title) || "Termin",
      subtitle: `${normalize(event.location)} · ${normalize(event.start_at)}`,
      href: `/calendar?event=${encodeURIComponent(event.id)}`,
      keywords: `${normalize(event.title)} ${normalize(event.location)} ${normalize(event.type)}`.toLowerCase()
    })),
    ...boxes.map((box) => ({
      id: `box:${box.id}`,
      type: "entity" as const,
      group: "Boxen" as const,
      title: normalize(box.name) || "Box",
      subtitle: normalize(box.nfc_tag) || "Material",
      href: `/inventory?box=${encodeURIComponent(box.id)}`,
      keywords: `${normalize(box.name)} ${normalize(box.nfc_tag)} ${normalize(box.description)}`.toLowerCase()
    })),
    ...chats.map((room) => ({
      id: `chat:${room.id}`,
      type: "entity" as const,
      group: "Chats" as const,
      title: normalize(room.name) || "Chat",
      subtitle: `${Number(room.message_count ?? 0)} Nachrichten`,
      href: `/chat?room=${encodeURIComponent(room.id)}`,
      keywords: `${normalize(room.name)} chat raum nachrichten`.toLowerCase()
    }))
  ];

  commandIndex.set({
    loading: false,
    loadedAt: Date.now(),
    items
  });
};
