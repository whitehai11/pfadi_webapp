<script lang="ts">
  import { get } from "svelte/store";
  import Avatar from "$lib/components/Avatar.svelte";
  import PushRuleCard from "$lib/components/PushRuleCard.svelte";
  import { apiFetch } from "$lib/api";
  import { refreshAppSettings } from "$lib/app-settings";
  import { session } from "$lib/auth";
  import { isValidTime } from "$lib/forms";
  import { activeOverlayId, closeOverlay, openOverlay } from "$lib/overlay";
  import { pushToast } from "$lib/toast";

  type Role = "admin" | "user" | "materialwart";
  type Status = "pending" | "approved" | "rejected";
  type UserRecord = {
    id: string;
    email: string;
    role: Role;
    status: Status;
    avatar_url?: string | null;
    created_at: string;
  };

  type SystemVersion = {
    version: string;
    commit: string;
    updated_at: string;
  };

  type HealthResponse = {
    status: "ok" | "degraded" | "shutting_down";
    uptimeSeconds: number;
  };

  type ChangelogEntry = {
    version: string;
    commit: string;
    updated_at: string;
  };

  type AdminLogEntry = {
    id: string;
    ts: string;
    level: "info" | "error";
    message: string;
  };

  const CHANGELOG_STORAGE_KEY = "pfadi_admin_changelog";
  const DELETE_MODAL_OVERLAY_ID = "admin-user-delete-modal";

  let users: UserRecord[] = [];
  let settings: Array<{ key: string; value: string; updated_at: string }> = [];
  let rules: any[] = [];
  let error = "";
  let userLoadError = "";
  let statusMessage = "";
  let quietStart = "21:00";
  let quietEnd = "06:00";
  let quietHoursSaving = false;
  let quietHoursError = "";
  let rulesLoading = false;

  let versionInfo: SystemVersion | null = null;
  let healthInfo: HealthResponse | null = null;
  let changelog: ChangelogEntry[] = [];
  let updatesLoading = false;
  let updateActionLoading = false;

  let selectedUserId = "";
  let userSearch = "";
  let roleFilter: "all" | Role = "all";
  let statusFilter: "all" | Status = "all";
  let userRoleDraft: Role = "user";
  let userActionLoading = false;

  let deleteModalOpen = false;
  let deleteConfirmText = "";
  let deleteLoading = false;
  let adminLogs: AdminLogEntry[] = [];

  const customRules = () => rules.filter((rule) => rule.rule_type === "custom-notification");

  const addAdminLog = (level: "info" | "error", message: string) => {
    const entry: AdminLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ts: new Date().toISOString(),
      level,
      message
    };
    adminLogs = [entry, ...adminLogs].slice(0, 40);
  };

  const normalizeRule = (rule: any) => ({
    ...rule,
    title: rule.title ?? "",
    message: rule.message ?? "",
    notification_type: rule.notification_type ?? "instant",
    target_type: rule.target_type ?? "all",
    target_id: rule.target_id ?? "",
    interval_value: rule.interval_value ?? 1,
    interval_unit: rule.interval_unit ?? "days",
    start_date: rule.start_date ?? "",
    end_date: rule.end_date ?? "",
    last_sent_at: rule.last_sent_at ?? null,
    is_active: rule.is_active === 1 || rule.is_active === true
  });

  const filteredUsers = () => {
    const search = userSearch.trim().toLowerCase();
    return users
      .filter((user) => (roleFilter === "all" ? true : user.role.toLowerCase() === roleFilter.toLowerCase()))
      .filter((user) => (statusFilter === "all" ? true : user.status === statusFilter))
      .filter((user) => (search ? user.email.toLowerCase().includes(search) : true))
      .sort((a, b) => a.email.localeCompare(b.email));
  };

  const selectedUser = () => users.find((user) => user.id === selectedUserId) ?? null;

  const statusLabel = (status: Status) => {
    if (status === "approved") return "Freigegeben";
    if (status === "pending") return "Ausstehend";
    return "Abgelehnt";
  };

  const statusBadgeClass = (status: Status) => {
    if (status === "approved") return "badge badge-success";
    if (status === "pending") return "badge badge-warning";
    return "badge badge-danger";
  };

  const healthBadgeClass = (status: HealthResponse["status"] | undefined) => {
    if (status === "ok") return "badge badge-success";
    if (status === "shutting_down") return "badge badge-warning";
    return "badge badge-danger";
  };

  const healthLabel = (status: HealthResponse["status"] | undefined) => {
    if (status === "ok") return "OK";
    if (status === "shutting_down") return "Wird beendet";
    if (status === "degraded") return "Gestort";
    return "Unbekannt";
  };

  const syncSelectedUser = () => {
    const currentFiltered = filteredUsers();
    if (!currentFiltered.length) {
      selectedUserId = "";
      return;
    }
    if (!currentFiltered.some((item) => item.id === selectedUserId)) {
      selectedUserId = currentFiltered[0].id;
    }
  };

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return "Unbekannt";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(date);
  };

  const formatUptime = (seconds: number | null | undefined) => {
    if (typeof seconds !== "number" || !Number.isFinite(seconds)) return "Unbekannt";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const loadChangelog = () => {
    if (typeof localStorage === "undefined") {
      changelog = [];
      return;
    }
    try {
      const parsed = JSON.parse(localStorage.getItem(CHANGELOG_STORAGE_KEY) || "[]");
      changelog = Array.isArray(parsed) ? parsed.slice(0, 15) : [];
    } catch {
      changelog = [];
    }
  };

  const storeChangelogEntry = (entry: SystemVersion | null) => {
    if (!entry || typeof localStorage === "undefined") return;
    const normalized: ChangelogEntry = {
      version: String(entry.version || "").trim(),
      commit: String(entry.commit || "").trim(),
      updated_at: String(entry.updated_at || "").trim()
    };
    if (!normalized.version || !normalized.commit || !normalized.updated_at) return;
    const next = [normalized, ...changelog.filter((item) => item.commit !== normalized.commit)].slice(0, 15);
    changelog = next;
    localStorage.setItem(CHANGELOG_STORAGE_KEY, JSON.stringify(next));
  };

  const loadOverview = async () => {
    try {
      const [version, health] = await Promise.all([
        apiFetch<SystemVersion>("/api/system/version", { toastOnError: false }).catch(() => null),
        apiFetch<HealthResponse>("/api/health", { toastOnError: false }).catch(() => null)
      ]);

      versionInfo = version;
      healthInfo = health;
      storeChangelogEntry(version);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Systemstatus konnte nicht geladen werden.";
      addAdminLog("error", msg);
    }
  };

  const load = async () => {
    error = "";
    userLoadError = "";
    const currentSession = get(session);
    if (!currentSession || currentSession.role !== "admin") {
      users = [];
      selectedUserId = "";
      return;
    }

    try {
      const loadedUsers = (await apiFetch("/api/admin/users?role=all")) as UserRecord[];
      console.log("[admin/users] response", loadedUsers);
      users = loadedUsers;
      settings = await apiFetch("/api/admin/settings");
      rules = (await apiFetch("/api/admin/push-rules")).map(normalizeRule);

      const map = new Map(settings.map((item) => [item.key, item.value]));
      quietStart = map.get("quiet_hours_start") ?? "21:00";
      quietEnd = map.get("quiet_hours_end") ?? "06:00";
      syncSelectedUser();
      await loadOverview();
      addAdminLog("info", "Admin-Daten geladen.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Admin-Daten konnten nicht geladen werden.";
      userLoadError = `Benutzer konnten nicht geladen werden: ${message}`;
      error = "Admin-Daten konnten nicht geladen werden.";
      users = [];
      selectedUserId = "";
      addAdminLog("error", message);
      console.error("[admin/users] request failed", err);
    }
  };

  const updateRole = async (id: string, role: Role) => {
    if (userActionLoading) return;
    userActionLoading = true;
    try {
      await apiFetch(`/api/admin/users/${id}/role`, {
        method: "PUT",
        body: JSON.stringify({ role })
      });
      pushToast("Rolle gespeichert.", "success", 1500);
      addAdminLog("info", "Benutzerrolle aktualisiert.");
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Rolle konnte nicht gespeichert werden.";
      error = msg;
      pushToast(msg, "error");
      addAdminLog("error", msg);
    } finally {
      userActionLoading = false;
    }
  };

  const updateUserStatus = async (id: string, status: "approved" | "rejected") => {
    if (userActionLoading) return;
    userActionLoading = true;
    try {
      await apiFetch(`/api/admin/users/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({
          status,
          role: status === "approved" ? userRoleDraft : undefined
        })
      });
      pushToast("Status aktualisiert.", "success", 1500);
      addAdminLog("info", `Benutzerstatus auf ${status} gesetzt.`);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Status konnte nicht aktualisiert werden.";
      error = msg;
      pushToast(msg, "error");
      addAdminLog("error", msg);
    } finally {
      userActionLoading = false;
    }
  };

  const forceLogoutUser = async (id: string) => {
    if (userActionLoading) return;
    userActionLoading = true;
    try {
      await apiFetch(`/api/admin/users/${id}/force-logout`, { method: "POST" });
      pushToast("Sitzung wurde beendet.", "success", 1500);
      addAdminLog("info", "Sitzung fuer Benutzer beendet.");
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Abmeldung fehlgeschlagen.";
      error = msg;
      pushToast(msg, "error");
      addAdminLog("error", msg);
    } finally {
      userActionLoading = false;
    }
  };

  const removeUserAvatar = async (id: string) => {
    if (userActionLoading) return;
    userActionLoading = true;
    try {
      await apiFetch(`/api/admin/users/${id}/avatar`, { method: "DELETE" });
      pushToast("Profilbild entfernt.", "success", 1500);
      addAdminLog("info", "Profilbild fuer Benutzer entfernt.");
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Profilbild konnte nicht entfernt werden.";
      error = msg;
      pushToast(msg, "error");
      addAdminLog("error", msg);
    } finally {
      userActionLoading = false;
    }
  };

  const openDeleteModal = () => {
    const user = selectedUser();
    if (!user) return;
    deleteConfirmText = "";
    openOverlay(DELETE_MODAL_OVERLAY_ID);
  };

  const closeDeleteModal = () => {
    if (deleteLoading) return;
    closeOverlay(DELETE_MODAL_OVERLAY_ID);
    deleteConfirmText = "";
  };

  const confirmDeleteUser = async () => {
    const user = selectedUser();
    if (!user || deleteLoading) return;
    if (deleteConfirmText.trim().toLowerCase() !== user.email.toLowerCase()) {
      pushToast("Bitte E-Mail zur Bestatigung eingeben.", "error");
      return;
    }
    deleteLoading = true;
    try {
      await apiFetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      pushToast("Konto wurde geloscht.", "success", 1500);
      addAdminLog("info", "Benutzerkonto geloescht.");
      closeOverlay(DELETE_MODAL_OVERLAY_ID);
      deleteConfirmText = "";
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Konto konnte nicht geloscht werden.";
      error = msg;
      pushToast(msg, "error");
      addAdminLog("error", msg);
    } finally {
      deleteLoading = false;
    }
  };

  const saveSettings = async (updated: any[]) => {
    await apiFetch("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify(updated.map((item) => ({ key: item.key, value: item.value })))
    });
    await refreshAppSettings();
    await load();
  };

  const saveQuietHours = async () => {
    if (quietHoursSaving) return;
    quietHoursError = "";
    if (!isValidTime(quietStart) || !isValidTime(quietEnd)) {
      quietHoursError = "Uhrzeit im Format HH:MM erforderlich.";
      return;
    }

    quietHoursSaving = true;
    const updated = [
      ...settings.filter((item) => item.key !== "quiet_hours_start" && item.key !== "quiet_hours_end"),
      { key: "quiet_hours_start", value: quietStart },
      { key: "quiet_hours_end", value: quietEnd }
    ];
    try {
      await saveSettings(updated);
      statusMessage = "Ruhezeiten gespeichert.";
      pushToast(statusMessage, "success", 1500);
      addAdminLog("info", "Ruhezeiten gespeichert.");
    } catch (err) {
      quietHoursError = err instanceof Error ? err.message : "Ruhezeiten konnten nicht gespeichert werden.";
      pushToast(quietHoursError, "error");
      addAdminLog("error", quietHoursError);
    } finally {
      quietHoursSaving = false;
    }
  };

  const toggleSetting = async (key: string, value: boolean) => {
    try {
      const updated = settings.map((item) => (item.key === key ? { ...item, value: value ? "true" : "false" } : item));
      await saveSettings(updated);
      pushToast("Einstellung gespeichert.", "success", 1200);
      addAdminLog("info", `Feature-Flag ${key} gesetzt: ${value ? "aktiv" : "inaktiv"}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Einstellung konnte nicht gespeichert werden.";
      error = msg;
      pushToast(msg, "error");
      addAdminLog("error", msg);
    }
  };

  const addRule = async () => {
    if (rulesLoading) return;
    rulesLoading = true;
    try {
      await apiFetch("/api/admin/push-rules", {
        method: "POST",
        body: JSON.stringify({
          title: "Neue Push-Regel",
          message: "Nachricht",
          notification_type: "instant",
          target_type: "all",
          target_id: null,
          interval_value: null,
          interval_unit: null,
          start_date: null,
          end_date: null,
          is_active: true
        })
      });
      pushToast("Push-Regel erstellt.", "success");
      addAdminLog("info", "Push-Regel erstellt.");
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Push-Regel konnte nicht erstellt werden.";
      error = msg;
      pushToast(msg, "error");
      addAdminLog("error", msg);
    } finally {
      rulesLoading = false;
    }
  };

  const saveRule = async (rule: any) => {
    statusMessage = "";
    try {
      await apiFetch(`/api/admin/push-rules/${rule.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: rule.title || "",
          message: rule.message || "",
          notification_type: rule.notification_type,
          target_type: rule.target_type,
          target_id: rule.target_type === "all" ? null : rule.target_id || null,
          interval_value: rule.notification_type === "recurring" ? Number(rule.interval_value || 1) : null,
          interval_unit: rule.notification_type === "recurring" ? rule.interval_unit : null,
          start_date: rule.notification_type === "recurring" ? rule.start_date || null : null,
          end_date: rule.notification_type === "recurring" ? rule.end_date || null : null,
          is_active: Boolean(rule.is_active)
        })
      });
      statusMessage = "Push-Regel gespeichert.";
      pushToast(statusMessage, "success", 1500);
      addAdminLog("info", "Push-Regel gespeichert.");
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Push-Regel konnte nicht gespeichert werden.";
      error = msg;
      pushToast(msg, "error");
      addAdminLog("error", msg);
      throw err;
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Push-Regel wirklich loschen?")) return;
    try {
      await apiFetch(`/api/admin/push-rules/${id}`, { method: "DELETE" });
      statusMessage = "Push-Regel geloscht.";
      pushToast(statusMessage, "success", 1500);
      addAdminLog("info", "Push-Regel geloescht.");
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Push-Regel konnte nicht geloscht werden.";
      error = msg;
      pushToast(msg, "error");
      addAdminLog("error", msg);
      throw err;
    }
  };

  const sendRuleNow = async (id: string) => {
    try {
      const result = await apiFetch<{ delivered?: number; skipped?: number; last_sent_at?: string }>(
        `/api/admin/push-rules/${id}/send`,
        { method: "POST" }
      );
      statusMessage = `Push gesendet (Gesendet: ${result?.delivered ?? 0}, Ubersprungen: ${result?.skipped ?? 0}).`;
      pushToast(statusMessage, "success", 1500);
      addAdminLog("info", "Push sofort gesendet.");
      await load();
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Push konnte nicht gesendet werden.";
      error = msg;
      pushToast(msg, "error");
      addAdminLog("error", msg);
      throw err;
    }
  };

  const checkUpdates = async () => {
    if (updatesLoading) return;
    updatesLoading = true;
    try {
      await loadOverview();
      pushToast("Update-Status aktualisiert.", "success", 1200);
      addAdminLog("info", "Update-Status geprueft.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update-Status konnte nicht geladen werden.";
      pushToast(msg, "error");
      addAdminLog("error", msg);
    } finally {
      updatesLoading = false;
    }
  };

  const runUpdateNow = async () => {
    if (updateActionLoading) return;
    updateActionLoading = true;
    try {
      await checkUpdates();
      pushToast("Kein Update-Endpunkt aktiv. Nutze update-now.sh auf dem Server.", "error");
      addAdminLog("error", "Manuelles Update aus UI nicht verfuegbar.");
    } finally {
      updateActionLoading = false;
    }
  };

  const createBackup = () => {
    pushToast("Backup-Aktion nicht ueber API verfuegbar.", "error");
    addAdminLog("error", "Backup erstellen nicht verfuegbar.");
  };

  const downloadBackup = () => {
    pushToast("Backup-Download nicht ueber API verfuegbar.", "error");
    addAdminLog("error", "Backup-Download nicht verfuegbar.");
  };

  const restoreBackup = () => {
    pushToast("Backup-Restore nicht ueber API verfuegbar.", "error");
    addAdminLog("error", "Backup-Restore nicht verfuegbar.");
  };

  $: {
    const current = selectedUser();
    if (current) {
      userRoleDraft = current.role;
    }
  }

  $: syncSelectedUser();

  $: if ($session?.role === "admin") {
    loadChangelog();
    void load();
  }

  $: deleteModalOpen = $activeOverlayId === DELETE_MODAL_OVERLAY_ID;
</script>

<div class="page-stack">
  <section class="page-intro">
    <h1 class="page-title">Admin</h1>
  </section>

  {#if !$session || $session.role !== "admin"}
    <section class="admin-console-section">
      <div class="list-row">
        <div class="list-meta">
          <strong>Kein Zugriff</strong>
        </div>
        <span class="badge badge-danger">Admin erforderlich</span>
      </div>
    </section>
  {:else}
    {#if error}
      <p class="status-banner error">{error}</p>
    {/if}
    {#if statusMessage}
      <p class="status-banner success">{statusMessage}</p>
    {/if}

    <section class="admin-console-section">
      <h2 class="section-title">Overview</h2>
      <div class="hairline-list">
        <div class="list-row">
          <div class="list-meta">
            <strong>Version</strong>
          </div>
          <span class="badge badge-secondary">{versionInfo?.version ?? "Unbekannt"}</span>
        </div>
        <div class="list-row">
          <div class="list-meta">
            <strong>Commit</strong>
          </div>
          <span class="badge badge-secondary">{versionInfo?.commit ?? "Unbekannt"}</span>
        </div>
        <div class="list-row">
          <div class="list-meta">
            <strong>Uptime</strong>
          </div>
          <span class="badge badge-secondary">{formatUptime(healthInfo?.uptimeSeconds)}</span>
        </div>
        <div class="list-row">
          <div class="list-meta">
            <strong>DB Status</strong>
          </div>
          <span class={healthBadgeClass(healthInfo?.status)}>{healthLabel(healthInfo?.status)}</span>
        </div>
      </div>
    </section>

    <section class="admin-console-section">
      <h2 class="section-title">Users</h2>
      <div class="admin-toolbar-grid">
        <div class="field">
          <label for="userSearch">Suche</label>
          <input id="userSearch" class="input" bind:value={userSearch} placeholder="E-Mail suchen" />
        </div>
        <div class="field">
          <label for="roleFilter">Rolle</label>
          <select id="roleFilter" class="select" bind:value={roleFilter}>
            <option value="all">Alle</option>
            <option value="admin">Admin</option>
            <option value="materialwart">Materialwart</option>
            <option value="user">Nutzer</option>
          </select>
        </div>
        <div class="field">
          <label for="statusFilter">Status</label>
          <select id="statusFilter" class="select" bind:value={statusFilter}>
            <option value="all">Alle</option>
            <option value="pending">Ausstehend</option>
            <option value="approved">Freigegeben</option>
            <option value="rejected">Abgelehnt</option>
          </select>
        </div>
      </div>

      <div class="field">
        <label for="userSelect">Benutzer</label>
        <select id="userSelect" class="select" bind:value={selectedUserId}>
          {#if users.length === 0}
            <option value="">Keine Benutzer vorhanden</option>
          {:else if filteredUsers().length === 0}
            <option value="">Keine Treffer fuer aktuellen Filter</option>
          {:else}
            {#each filteredUsers() as user}
              <option value={user.id}>{user.email}</option>
            {/each}
          {/if}
        </select>
      </div>

      {#if filteredUsers().length > 0}
        <div class="admin-user-list">
          {#each filteredUsers().slice(0, 8) as user}
            <button
              class={`list-row admin-user-list__item ${selectedUserId === user.id ? "is-active" : ""}`}
              type="button"
              on:click={() => (selectedUserId = user.id)}
            >
              <div class="admin-user-list__meta">
                <Avatar name={user.email} avatarUrl={user.avatar_url ?? null} size={40} />
                <div class="list-meta">
                  <strong>{user.email}</strong>
                  <span class="text-muted">{user.role}</span>
                </div>
              </div>
              <span class={statusBadgeClass(user.status)}>{statusLabel(user.status)}</span>
            </button>
          {/each}
        </div>
      {/if}

      {#if userLoadError}
        <p class="status-banner error">{userLoadError}</p>
      {/if}

      {#if selectedUser()}
        <div class="hairline-list">
          <div class="list-row">
            <div class="admin-selected-user">
              <Avatar name={selectedUser()?.email || "User"} avatarUrl={selectedUser()?.avatar_url ?? null} size={96} />
              <div class="list-meta">
                <strong>{selectedUser()?.email}</strong>
                <span class="text-muted">Erstellt am {formatDateTime(selectedUser()?.created_at)}</span>
              </div>
            </div>
            <span class={statusBadgeClass(selectedUser()!.status)}>{statusLabel(selectedUser()!.status)}</span>
          </div>
          <div class="actions">
            <button
              class="btn btn-outline"
              type="button"
              disabled={userActionLoading}
              on:click={() => updateUserStatus(selectedUser()!.id, "approved")}
            >
              Freigeben
            </button>
            <button
              class="btn btn-outline"
              type="button"
              disabled={userActionLoading}
              on:click={() => updateUserStatus(selectedUser()!.id, "rejected")}
            >
              Ablehnen
            </button>
            <button
              class="btn btn-outline"
              type="button"
              disabled={userActionLoading}
              on:click={() => removeUserAvatar(selectedUser()!.id)}
            >
              Profilbild entfernen
            </button>
          </div>
        </div>
      {/if}
    </section>

    <section class="admin-console-section">
      <h2 class="section-title">Roles</h2>
      {#if selectedUser()}
        <div class="field">
          <label for="userRole">Rolle</label>
          <select id="userRole" class="select" bind:value={userRoleDraft}>
            <option value="user">Nutzer</option>
            <option value="materialwart">Materialwart</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div class="actions">
          <button
            class="btn btn-primary"
            type="button"
            disabled={userActionLoading}
            on:click={() => updateRole(selectedUser()!.id, userRoleDraft)}
          >
            Rolle speichern
          </button>
          <button
            class="btn btn-outline"
            type="button"
            disabled={userActionLoading}
            on:click={() => forceLogoutUser(selectedUser()!.id)}
          >
            Force Logout
          </button>
          <button class="btn btn-danger" type="button" disabled={userActionLoading} on:click={openDeleteModal}>
            Konto loschen
          </button>
        </div>
      {:else}
        <p class="text-muted">Kein Benutzer ausgewahlt.</p>
      {/if}
    </section>

    <section id="push-rules" class="admin-console-section">
      <div class="section-head">
        <h2 class="section-title">Push</h2>
        <button class="btn btn-primary" type="button" on:click={addRule} disabled={rulesLoading}>
          {#if rulesLoading}
            <span class="btn-spinner" aria-hidden="true"></span>
          {/if}
          {rulesLoading ? "Erstellen..." : "Neue Regel"}
        </button>
      </div>
      {#if customRules().length === 0}
        <p class="text-muted">Keine Push-Regeln vorhanden.</p>
      {:else}
        <div class="admin-rule-list">
          {#each customRules() as rule}
            <PushRuleCard {rule} {users} onSave={saveRule} onDelete={deleteRule} onSend={sendRuleNow} />
          {/each}
        </div>
      {/if}
    </section>

    <section class="admin-console-section">
      <div class="section-head">
        <h2 class="section-title">Updates</h2>
        <div class="actions">
          <button class="btn btn-outline" type="button" on:click={checkUpdates} disabled={updatesLoading}>
            {updatesLoading ? "Prufe..." : "Prufen"}
          </button>
          <button class="btn btn-primary" type="button" on:click={runUpdateNow} disabled={updateActionLoading}>
            {updateActionLoading ? "Starte..." : "Update starten"}
          </button>
        </div>
      </div>
      <div class="hairline-list">
        <div class="list-row">
          <div class="list-meta">
            <strong>Aktuelle Version</strong>
          </div>
          <span class="badge badge-secondary">{versionInfo?.version ?? "Unbekannt"}</span>
        </div>
        <div class="list-row">
          <div class="list-meta">
            <strong>Letztes Update</strong>
          </div>
          <span class="badge badge-secondary">{formatDateTime(versionInfo?.updated_at)}</span>
        </div>
      </div>
      <div class="admin-changelog">
        {#if changelog.length === 0}
          <p class="text-muted">Kein Changelog vorhanden.</p>
        {:else}
          {#each changelog as entry}
            <div class="list-row">
              <div class="list-meta">
                <strong>{entry.version}</strong>
                <span class="text-muted">{formatDateTime(entry.updated_at)}</span>
              </div>
              <span class="badge badge-secondary">{entry.commit}</span>
            </div>
          {/each}
        {/if}
      </div>
    </section>

    <section class="admin-console-section">
      <h2 class="section-title">Backup</h2>
      <div class="actions">
        <button class="btn btn-outline" type="button" on:click={createBackup}>Backup erstellen</button>
        <button class="btn btn-outline" type="button" on:click={downloadBackup}>Backup herunterladen</button>
        <button class="btn btn-danger" type="button" on:click={restoreBackup}>Backup wiederherstellen</button>
      </div>
    </section>

    <section class="admin-console-section">
      <h2 class="section-title">Logs</h2>
      <div class="admin-log-list">
        {#if adminLogs.length === 0}
          <p class="text-muted">Keine Eintrage.</p>
        {:else}
          {#each adminLogs as entry}
            <div class="list-row">
              <div class="list-meta">
                <strong>{entry.message}</strong>
                <span class="text-muted">{formatDateTime(entry.ts)}</span>
              </div>
              <span class={entry.level === "error" ? "badge badge-danger" : "badge badge-secondary"}>
                {entry.level}
              </span>
            </div>
          {/each}
        {/if}
      </div>
    </section>

    <section class="admin-console-section">
      <h2 class="section-title">Feature Flags</h2>
      <div class="hairline-list">
        {#each settings.filter((item) => item.key === "chat_enabled" || item.key === "nfc_enabled") as item}
          <div class="toggle-row">
            <div class="list-meta">
              <strong>{item.key === "chat_enabled" ? "Chat aktivieren" : "NFC aktivieren"}</strong>
            </div>
            <label class="toggle">
              <input
                type="checkbox"
                checked={item.value === "true"}
                on:change={(e) => toggleSetting(item.key, e.currentTarget.checked)}
              />
            </label>
          </div>
        {/each}
      </div>

      <div class="section-divider"></div>

      <h3 class="section-title section-title-small">Push Ruhezeiten</h3>
      <div class="split-grid">
        <div class="field">
          <label for="quietStart">Beginn</label>
          <input id="quietStart" class="input" type="time" bind:value={quietStart} />
        </div>
        <div class="field">
          <label for="quietEnd">Ende</label>
          <input id="quietEnd" class="input" type="time" bind:value={quietEnd} />
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-primary" type="button" on:click={saveQuietHours} disabled={quietHoursSaving}>
          {#if quietHoursSaving}
            <span class="btn-spinner" aria-hidden="true"></span>
          {/if}
          {quietHoursSaving ? "Speichern..." : "Speichern"}
        </button>
      </div>
      {#if quietHoursError}
        <p class="status-banner error">{quietHoursError}</p>
      {/if}
    </section>
  {/if}
</div>

{#if deleteModalOpen && selectedUser()}
  <div class="admin-modal" role="dialog" aria-modal="true" aria-label="Konto loschen">
    <button type="button" class="admin-modal__backdrop" aria-label="Schliessen" on:click={closeDeleteModal}></button>
    <div class="admin-modal__panel">
      <h2 class="section-title">Konto loschen</h2>
      <p class="text-muted">Bestatige mit der E-Mail: <strong>{selectedUser()!.email}</strong></p>
      <input class="input" bind:value={deleteConfirmText} placeholder="E-Mail eingeben" />
      <div class="actions">
        <button class="btn btn-outline" type="button" on:click={closeDeleteModal} disabled={deleteLoading}>
          Abbrechen
        </button>
        <button class="btn btn-danger" type="button" on:click={confirmDeleteUser} disabled={deleteLoading}>
          {#if deleteLoading}
            <span class="btn-spinner" aria-hidden="true"></span>
          {/if}
          {deleteLoading ? "Loschen..." : "Endgultig loschen"}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .admin-console-section {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-2) 0;
    border-top: 1px solid var(--surface-border);
  }

  .admin-console-section:first-of-type {
    border-top: 0;
    padding-top: 0;
  }

  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-1);
    flex-wrap: wrap;
  }

  .section-title-small {
    font-size: 0.95rem;
  }

  .section-divider {
    height: 1px;
    background: var(--surface-border);
  }

  .admin-toolbar-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-1);
  }

  .admin-rule-list,
  .admin-changelog,
  .admin-log-list {
    display: grid;
    gap: var(--space-1);
  }

  .admin-user-list {
    display: grid;
    gap: 0;
    border-top: 1px solid var(--surface-border);
    border-bottom: 1px solid var(--surface-border);
  }

  .admin-user-list__item {
    border: 0;
    background: transparent;
    text-align: left;
    border-radius: 0;
  }

  .admin-user-list__item.is-active {
    background: var(--surface-subtle);
  }

  .admin-user-list__meta {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .admin-selected-user {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .admin-modal {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: grid;
    place-items: center;
    padding: 1rem;
  }

  .admin-modal__backdrop {
    position: absolute;
    inset: 0;
    border: 0;
    background: var(--surface-notification-backdrop);
  }

  .admin-modal__panel {
    position: relative;
    width: min(100%, 420px);
    border-radius: var(--radius-lg);
    background: var(--surface-menu);
    box-shadow: var(--shadow-elev);
    padding: var(--space-2);
    display: grid;
    gap: var(--space-1);
  }

  @media (max-width: 860px) {
    .admin-toolbar-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
