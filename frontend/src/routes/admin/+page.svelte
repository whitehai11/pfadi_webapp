<script lang="ts">
  import { onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import PushRuleCard from "$lib/components/PushRuleCard.svelte";
  import { apiFetch } from "$lib/api";
  import { refreshAppSettings } from "$lib/app-settings";
  import { session } from "$lib/auth";

  let users: any[] = [];
  let settings: any[] = [];
  let rules: any[] = [];
  let error = "";
  let statusMessage = "";
  let quietStart = "21:00";
  let quietEnd = "06:00";
  let approvalRole: Record<string, "admin" | "user" | "materialwart"> = {};

  const pendingUsers = () => users.filter((user) => user.status === "pending");
  const customRules = () => rules.filter((rule) => rule.rule_type === "custom-notification");

  const normalizeRule = (rule: any) => ({
    ...rule,
    enabled: rule.enabled === 1 || rule.enabled === true,
    target_user_id: rule.target_user_id ?? "",
    target_role: rule.target_role ?? "",
    title: rule.title ?? "",
    message: rule.message ?? "",
    notification_type: rule.notification_type ?? "instant",
    target_type: rule.target_type ?? "all",
    target_id: rule.target_id ?? "",
    is_recurring: rule.is_recurring === 1 || rule.is_recurring === true,
    interval_value: rule.interval_value ?? 1,
    interval_unit: rule.interval_unit ?? "days",
    start_date: rule.start_date ?? "",
    end_date: rule.end_date ?? "",
    last_sent_at: rule.last_sent_at ?? null,
    is_active: rule.is_active === 1 || rule.is_active === true
  });

  const load = async () => {
    error = "";
    try {
      users = await apiFetch("/api/admin/users");
      settings = await apiFetch("/api/admin/settings");
      rules = (await apiFetch("/api/admin/push-rules")).map(normalizeRule);

      const map = new Map(settings.map((item) => [item.key, item.value]));
      quietStart = map.get("quiet_hours_start") ?? "21:00";
      quietEnd = map.get("quiet_hours_end") ?? "06:00";
      approvalRole = users.reduce(
        (acc, user) => ({
          ...acc,
          [user.id]: user.role || "user"
        }),
        {} as Record<string, "admin" | "user" | "materialwart">
      );
    } catch {
      error = "Admin-Daten konnten nicht geladen werden.";
    }
  };

  const updateRole = async (id: string, role: string) => {
    await apiFetch(`/api/admin/users/${id}/role`, {
      method: "PUT",
      body: JSON.stringify({ role })
    });
    await load();
  };

  const updateUserStatus = async (id: string, status: "approved" | "rejected") => {
    await apiFetch(`/api/admin/users/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({
        status,
        role: status === "approved" ? approvalRole[id] ?? "user" : undefined
      })
    });
    await load();
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
    const updated = [
      ...settings.filter((item) => item.key !== "quiet_hours_start" && item.key !== "quiet_hours_end"),
      { key: "quiet_hours_start", value: quietStart },
      { key: "quiet_hours_end", value: quietEnd }
    ];
    await saveSettings(updated);
    statusMessage = "Ruhezeiten gespeichert.";
  };

  const toggleSetting = async (key: string, value: boolean) => {
    const updated = settings.map((item) =>
      item.key === key ? { ...item, value: value ? "true" : "false" } : item
    );
    await saveSettings(updated);
  };

  const addRule = async () => {
    await apiFetch("/api/admin/push-rules", {
      method: "POST",
      body: JSON.stringify({
        rule_type: "custom-notification",
        enabled: true,
        lead_time_hours: 0,
        target_user_id: null,
        target_role: null,
        title_template: null,
        body_template: null,
        min_response_percent: null,
        event_type: null,
        send_start: null,
        send_end: null,
        schedule_start_date: null,
        schedule_every: null,
        schedule_time: null,
        cooldown_hours: 0,
        title: "",
        message: "",
        notification_type: "instant",
        target_type: "all",
        target_id: null,
        is_recurring: false,
        interval_value: 1,
        interval_unit: "days",
        start_date: null,
        end_date: null,
        last_sent_at: null,
        is_active: true
      })
    });
    await load();
  };

  const saveRule = async (rule: any) => {
    statusMessage = "";
    await apiFetch(`/api/admin/push-rules/${rule.id}`, {
      method: "PUT",
      body: JSON.stringify({
        rule_type: "custom-notification",
        enabled: rule.notification_type === "recurring" ? Boolean(rule.is_active) : true,
        lead_time_hours: 0,
        target_user_id: rule.target_type === "user" ? rule.target_id || null : null,
        target_role: rule.target_type === "role" ? rule.target_id || null : null,
        title_template: null,
        body_template: null,
        min_response_percent: null,
        event_type: null,
        send_start: null,
        send_end: null,
        schedule_start_date: null,
        schedule_every: null,
        schedule_time: null,
        cooldown_hours: 0,
        title: rule.title || null,
        message: rule.message || null,
        notification_type: rule.notification_type,
        target_type: rule.target_type,
        target_id: rule.target_type === "all" ? null : rule.target_id || null,
        is_recurring: rule.notification_type === "recurring",
        interval_value: rule.notification_type === "recurring" ? Number(rule.interval_value || 1) : null,
        interval_unit: rule.notification_type === "recurring" ? rule.interval_unit : null,
        start_date: rule.notification_type === "recurring" ? rule.start_date || null : null,
        end_date: rule.notification_type === "recurring" ? rule.end_date || null : null,
        last_sent_at: rule.last_sent_at || null,
        is_active: rule.notification_type === "recurring" ? Boolean(rule.is_active) : true
      })
    });
    statusMessage = "Push-Regel gespeichert.";
    await load();
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Push-Regel wirklich loschen?")) return;
    await apiFetch(`/api/admin/push-rules/${id}`, { method: "DELETE" });
    statusMessage = "Push-Regel geloscht.";
    await load();
  };

  const sendRuleNow = async (id: string) => {
    await apiFetch(`/api/admin/push-rules/${id}/send`, { method: "POST" });
    statusMessage = "Push wurde gesendet.";
    await load();
  };

  onMount(load);
</script>

<div class="page-stack">
  <section class="page-intro">
    <p class="page-kicker">Admin</p>
    <h1 class="page-title">Admin</h1>
  </section>

  {#if !$session || $session.role !== "admin"}
    <Card title="Kein Zugriff">
      <p class="text-muted">Bitte mit einem Administrationskonto anmelden.</p>
    </Card>
  {:else}
    {#if error}
      <p class="status-banner error">{error}</p>
    {/if}

    {#if statusMessage}
      <p class="status-banner success">{statusMessage}</p>
    {/if}

    <Card title="Benutzeranfragen">
      {#if pendingUsers().length === 0}
        <p class="text-muted">Zurzeit warten keine neuen Accounts auf Freigabe.</p>
      {:else}
        <div class="hairline-list">
          {#each pendingUsers() as user}
            <div class="approval-row">
              <div class="list-meta">
                <strong>{user.email}</strong>
                <span class="text-muted">Beantragt am {new Date(user.created_at).toLocaleString("de-DE")}</span>
              </div>

              <div class="approval-actions">
                <select class="select" bind:value={approvalRole[user.id]}>
                  <option value="user">Nutzer</option>
                  <option value="materialwart">Materialwart</option>
                  <option value="admin">Admin</option>
                </select>
                <button class="btn btn-primary" type="button" on:click={() => updateUserStatus(user.id, "approved")}>Freigeben</button>
                <button class="btn btn-danger" type="button" on:click={() => updateUserStatus(user.id, "rejected")}>Ablehnen</button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </Card>

    <section class="split-grid">
      <Card title="Rollenverwaltung">
        <div class="hairline-list">
          {#each users as user}
            <div class="list-row">
              <div class="list-meta">
                <strong>{user.email}</strong>
                <span class="text-muted">Status: {user.status}</span>
              </div>
              <select class="select" bind:value={user.role} on:change={(e) => updateRole(user.id, e.currentTarget.value)}>
                <option value="user">Nutzer</option>
                <option value="materialwart">Materialwart</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          {/each}
        </div>
      </Card>

      <Card title="Funktionen">
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
      </Card>
    </section>

    <Card title="Ruhezeiten">
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
        <button class="btn btn-primary" type="button" on:click={saveQuietHours}>Speichern</button>
      </div>
    </Card>

    <Card title="Push-Regel">
      <div slot="actions" class="actions">
        <button class="btn btn-primary" type="button" on:click={addRule}>Neue Regel</button>
      </div>

      {#if customRules().length === 0}
        <p class="text-muted">Noch keine Push-Regel vorhanden.</p>
      {:else}
        <div class="card-grid">
          {#each customRules() as rule}
            <PushRuleCard rule={rule} {users} onSave={saveRule} onDelete={deleteRule} onSend={sendRuleNow} />
          {/each}
        </div>
      {/if}
    </Card>
  {/if}
</div>

<style>
  .approval-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .approval-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .approval-actions .select {
    min-width: 11rem;
  }

  @media (max-width: 720px) {
    .approval-row,
    .approval-actions {
      align-items: stretch;
      flex-direction: column;
    }
  }
</style>
