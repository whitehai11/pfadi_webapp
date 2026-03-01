<script lang="ts">
  import { onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import { apiFetch } from "$lib/api";
  import { pushToast } from "$lib/toast";

  type UserRow = {
    id: string;
    email: string;
    role: "admin" | "user" | "materialwart";
    status: "pending" | "approved" | "rejected";
    created_at: string;
    avatar_url?: string | null;
  };

  type PendingRow = {
    id: string;
    email: string;
    role: "admin" | "user" | "materialwart";
    status: "pending";
    created_at: string;
  };

  const roleOptions = [
    { value: "alle", label: "Alle Rollen" },
    { value: "admin", label: "Admin" },
    { value: "materialwart", label: "Materialwart" },
    { value: "user", label: "Nutzer" }
  ];

  let loading = true;
  let users: UserRow[] = [];
  let pendingRequests: PendingRow[] = [];
  let roleFilter = "alle";
  let previousRoleFilter = roleFilter;
  let search = "";
  let busyKeys: Record<string, boolean> = {};
  let draftRole: Record<string, UserRow["role"]> = {};
  let draftStatus: Record<string, UserRow["status"]> = {};

  const isBusy = (key: string) => Boolean(busyKeys[key]);
  const setBusy = (key: string, value: boolean) => {
    busyKeys = { ...busyKeys, [key]: value };
  };

  const formatDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
  };

  const syncDrafts = () => {
    const nextRole: Record<string, UserRow["role"]> = {};
    const nextStatus: Record<string, UserRow["status"]> = {};
    for (const user of users) {
      nextRole[user.id] = user.role;
      nextStatus[user.id] = user.status;
    }
    draftRole = nextRole;
    draftStatus = nextStatus;
  };

  const loadUsers = async () => {
    const query = roleFilter === "alle" ? "" : `?role=${encodeURIComponent(roleFilter)}`;
    const data = await apiFetch<UserRow[]>(`/api/admin/users${query}`);
    users = data;
    syncDrafts();
  };

  const loadPending = async () => {
    pendingRequests = await apiFetch<PendingRow[]>("/api/admin/user-requests");
    const nextDraft = { ...draftRole };
    for (const request of pendingRequests) {
      if (!nextDraft[request.id]) {
        nextDraft[request.id] = request.role ?? "user";
      }
    }
    draftRole = nextDraft;
  };

  const loadAll = async () => {
    loading = true;
    try {
      await Promise.all([loadUsers(), loadPending()]);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Benutzerdaten konnten nicht geladen werden.", "error");
    } finally {
      loading = false;
    }
  };

  const updateUserRole = async (userId: string) => {
    const key = `role:${userId}`;
    if (isBusy(key)) return;
    setBusy(key, true);
    try {
      await apiFetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role: draftRole[userId] })
      });
      pushToast("Rolle aktualisiert.", "success", 1000);
      await loadUsers();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Rolle konnte nicht aktualisiert werden.", "error");
    } finally {
      setBusy(key, false);
    }
  };

  const updateUserStatus = async (userId: string) => {
    const key = `status:${userId}`;
    if (isBusy(key)) return;
    setBusy(key, true);
    try {
      await apiFetch(`/api/admin/users/${userId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: draftStatus[userId] })
      });
      pushToast("Status aktualisiert.", "success", 1000);
      await loadAll();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Status konnte nicht aktualisiert werden.", "error");
    } finally {
      setBusy(key, false);
    }
  };

  const approveRequest = async (requestId: string, role: UserRow["role"]) => {
    const key = `approve:${requestId}`;
    if (isBusy(key)) return;
    setBusy(key, true);
    try {
      await apiFetch(`/api/admin/users/${requestId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "approved", role })
      });
      pushToast("Anfrage freigegeben.", "success", 1000);
      await loadAll();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Freigabe fehlgeschlagen.", "error");
    } finally {
      setBusy(key, false);
    }
  };

  const rejectRequest = async (requestId: string) => {
    const key = `reject:${requestId}`;
    if (isBusy(key)) return;
    setBusy(key, true);
    try {
      await apiFetch(`/api/admin/users/${requestId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "rejected" })
      });
      pushToast("Anfrage abgelehnt.", "success", 1000);
      await loadAll();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Ablehnung fehlgeschlagen.", "error");
    } finally {
      setBusy(key, false);
    }
  };

  const forceLogout = async (userId: string) => {
    const key = `logout:${userId}`;
    if (isBusy(key)) return;
    setBusy(key, true);
    try {
      await apiFetch(`/api/admin/users/${userId}/force-logout`, { method: "POST" });
      pushToast("Sitzungen wurden beendet.", "success", 1000);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Force-Logout fehlgeschlagen.", "error");
    } finally {
      setBusy(key, false);
    }
  };

  const removeUser = async (userId: string, email: string) => {
    if (!confirm(`Benutzer ${email} wirklich löschen?`)) return;
    const key = `delete:${userId}`;
    if (isBusy(key)) return;
    setBusy(key, true);
    try {
      await apiFetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      pushToast("Benutzer gelöscht.", "success", 1000);
      await loadAll();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Benutzer konnte nicht gelöscht werden.", "error");
    } finally {
      setBusy(key, false);
    }
  };

  $: visibleUsers = users.filter((user) => {
    if (!search.trim()) return true;
    const needle = search.trim().toLowerCase();
    return user.email.toLowerCase().includes(needle);
  });

  $: if (roleFilter !== previousRoleFilter) {
    previousRoleFilter = roleFilter;
    if (!loading) {
      void loadUsers();
    }
  }

  onMount(() => {
    void loadAll();
  });
</script>

<section class="section-block">
  <h2 class="section-title">User Management</h2>

  <Card title="Benutzeranfragen">
    {#if loading}
      <p class="text-muted">Lade Anfragen...</p>
    {:else if pendingRequests.length === 0}
      <p class="text-muted">Keine offenen Anfragen.</p>
    {:else}
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Nutzername</th>
              <th>Registriert</th>
              <th>Rolle bei Freigabe</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {#each pendingRequests as request}
              <tr>
                <td>{request.email}</td>
                <td>{formatDate(request.created_at)}</td>
                <td>
                  <select bind:value={draftRole[request.id]}>
                    <option value="user">Nutzer</option>
                    <option value="materialwart">Materialwart</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  <div class="actions">
                    <button class="btn btn-primary" type="button" disabled={isBusy(`approve:${request.id}`)} on:click={() => approveRequest(request.id, draftRole[request.id] ?? "user")}>
                      Freigeben
                    </button>
                    <button class="btn btn-danger" type="button" disabled={isBusy(`reject:${request.id}`)} on:click={() => rejectRequest(request.id)}>
                      Ablehnen
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>

  <Card title="Benutzerverwaltung">
    <div class="toolbar">
      <input class="input" placeholder="Suche nach Nutzername" bind:value={search} />
      <select bind:value={roleFilter}>
        {#each roleOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>

    {#if loading}
      <p class="text-muted">Lade Benutzer...</p>
    {:else if visibleUsers.length === 0}
      <p class="text-muted">Keine Benutzer für den aktuellen Filter.</p>
    {:else}
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Nutzer</th>
              <th>Rolle</th>
              <th>Status</th>
              <th>Erstellt</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {#each visibleUsers as user}
              <tr>
                <td>{user.email}</td>
                <td>
                  <select bind:value={draftRole[user.id]}>
                    <option value="user">Nutzer</option>
                    <option value="materialwart">Materialwart</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  <select bind:value={draftStatus[user.id]}>
                    <option value="approved">Freigegeben</option>
                    <option value="pending">Ausstehend</option>
                    <option value="rejected">Abgelehnt</option>
                  </select>
                </td>
                <td>{formatDate(user.created_at)}</td>
                <td>
                  <div class="actions">
                    <button class="btn btn-outline" type="button" disabled={isBusy(`role:${user.id}`)} on:click={() => updateUserRole(user.id)}>
                      Rolle speichern
                    </button>
                    <button class="btn btn-outline" type="button" disabled={isBusy(`status:${user.id}`)} on:click={() => updateUserStatus(user.id)}>
                      Status speichern
                    </button>
                    <button class="btn btn-outline" type="button" disabled={isBusy(`logout:${user.id}`)} on:click={() => forceLogout(user.id)}>
                      Force Logout
                    </button>
                    <button class="btn btn-danger" type="button" disabled={isBusy(`delete:${user.id}`)} on:click={() => removeUser(user.id, user.email)}>
                      Löschen
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>
</section>

<style>
  .toolbar {
    display: grid;
    gap: var(--space-1);
    grid-template-columns: minmax(0, 1fr) auto;
    margin-bottom: var(--space-2);
  }

  @media (max-width: 680px) {
    .toolbar {
      grid-template-columns: 1fr;
    }
  }
</style>
