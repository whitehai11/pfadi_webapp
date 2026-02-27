<script lang="ts">
  import { onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import SegmentedControl from "$lib/components/SegmentedControl.svelte";
  import SettingsRow from "$lib/components/SettingsRow.svelte";
  import SlideOverDetail from "$lib/components/SlideOverDetail.svelte";
  import { apiFetch } from "$lib/api";
  import { refreshAppSettings } from "$lib/app-settings";
  import { session } from "$lib/auth";

  let users: any[] = [];
  let settings: any[] = [];
  let rules: any[] = [];
  let error = "";
  let pushTestMessage = "";
  let quietStart = "21:00";
  let quietEnd = "06:00";
  let activeReminderId: string | null = null;
  let activeReminderPanel: "remind" | "repeat" | "audience" | "message" | null = null;
  let reminderWindowEnabled: Record<string, boolean> = {};
  let approvalRole: Record<string, "admin" | "user" | "materialwart"> = {};

  const ruleTypes = [
    { value: "event-reminder", label: "Termin-Erinnerung" },
    { value: "availability-missing", label: "Ruckmeldung fehlt" },
    { value: "packlist-missing", label: "Packliste fehlt" },
    { value: "packlist-incomplete", label: "Packliste unvollstandig" },
    { value: "event-created", label: "Termin erstellt" },
    { value: "event-updated", label: "Termin geandert" },
    { value: "event-canceled", label: "Termin abgesagt" },
    { value: "inventory-low", label: "Material unter Mindestmenge" },
    { value: "weekly-admin", label: "Wochentliche Admin-Erinnerung" }
  ];

  const roleOptions = [
    { value: "", label: "Alle" },
    { value: "user", label: "Nutzer" },
    { value: "materialwart", label: "Material" },
    { value: "admin", label: "Admin" }
  ];

  const leadUnitOptions = [
    { value: "hours", label: "Stunden" },
    { value: "days", label: "Tage" },
    { value: "weeks", label: "Wochen" }
  ];

  const repeatOptions = [
    { value: "", label: "Aus" },
    { value: "daily", label: "Taglich" },
    { value: "weekly", label: "Wochentlich" },
    { value: "monthly", label: "Monatlich" }
  ];

  const eventTypeOptions = [
    { value: "", label: "Alle" },
    { value: "Gruppenstunde", label: "Gruppe" },
    { value: "Lager", label: "Lager" },
    { value: "Aktion", label: "Aktion" },
    { value: "Sonstiges", label: "Sonstiges" }
  ];

  const reminderAudienceOptions = [
    { value: "", label: "Alle passenden" },
    { value: "user", label: "Teilnehmende" },
    { value: "materialwart", label: "Materialteam" },
    { value: "admin", label: "Leitung" }
  ];

  const isKnownRuleType = (value: string) => ruleTypes.some((type) => type.value === value);
  const isScheduleRule = (ruleType: string) =>
    ["availability-missing", "packlist-missing", "packlist-incomplete", "weekly-admin", "inventory-low"].includes(
      ruleType
    );

  const inferUnit = (hours: number) => {
    if (hours % 168 === 0) return { value: hours / 168, unit: "weeks" };
    if (hours % 24 === 0) return { value: hours / 24, unit: "days" };
    return { value: hours, unit: "hours" };
  };

  const ruleLabel = (value: string) => ruleTypes.find((type) => type.value === value)?.label ?? value;
  const reminderRoleLabel = (value: string) =>
    reminderAudienceOptions.find((option) => option.value === value)?.label ?? "Alle passenden";
  const repeatLabel = (value: string) => repeatOptions.find((option) => option.value === value)?.label ?? "Aus";
  const pendingUsers = () => users.filter((user) => user.status === "pending");

  const normalizeRule = (rule: any) => {
    const leadHours = Number(rule.lead_time_hours) || 0;
    const { value, unit } = inferUnit(leadHours);
    return {
      ...rule,
      enabled: rule.enabled === 1 || rule.enabled === true,
      target_user_id: rule.target_user_id ?? "",
      target_role: rule.target_role ?? "",
      lead_value: value,
      lead_unit: unit,
      title_template: rule.title_template ?? "",
      body_template: rule.body_template ?? "",
      min_response_percent: rule.min_response_percent ?? "",
      event_type: rule.event_type ?? "",
      send_start: rule.send_start ?? "",
      send_end: rule.send_end ?? "",
      schedule_start_date: rule.schedule_start_date ?? "",
      schedule_every: rule.schedule_every ?? "",
      schedule_time: rule.schedule_time ?? "",
      cooldown_hours: rule.cooldown_hours ?? 24
    };
  };

  const load = async () => {
    error = "";
    try {
      users = await apiFetch("/api/admin/users");
      settings = await apiFetch("/api/admin/settings");
      rules = (await apiFetch("/api/admin/push-rules")).map(normalizeRule);
      reminderWindowEnabled = rules.reduce(
        (acc, rule) => ({
          ...acc,
          [rule.id]: Boolean(rule.send_start || rule.send_end)
        }),
        {}
      );
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
  };

  const sendTestPush = async () => {
    pushTestMessage = "";
    try {
      await apiFetch("/api/push/test", { method: "POST" });
      pushTestMessage = "Test-Benachrichtigung versendet.";
    } catch {
      pushTestMessage = "Test-Benachrichtigung fehlgeschlagen.";
    }
  };

  const toggleSetting = async (key: string, value: boolean) => {
    const updated = settings.map((item) =>
      item.key === key ? { ...item, value: value ? "true" : "false" } : item
    );
    await saveSettings(updated);
  };

  const addRule = async () => {
    const today = new Date().toISOString().slice(0, 10);
    await apiFetch("/api/admin/push-rules", {
      method: "POST",
      body: JSON.stringify({
        rule_type: "event-reminder",
        enabled: true,
        lead_time_hours: 24,
        title_template: "Termin-Erinnerung",
        body_template: "{event.title} startet am {event.start}",
        cooldown_hours: 24,
        schedule_start_date: today,
        schedule_every: "daily",
        schedule_time: "08:00"
      })
    });
    await load();
  };

  const updateRule = async (rule: any, closePanel = false) => {
    const multiplier = rule.lead_unit === "weeks" ? 168 : rule.lead_unit === "days" ? 24 : 1;
    const leadHours =
      rule.rule_type === "event-reminder"
        ? Math.max(1, Number(rule.lead_value || 0) * multiplier)
        : Number(rule.lead_time_hours || 0);

    await apiFetch(`/api/admin/push-rules/${rule.id}`, {
      method: "PUT",
      body: JSON.stringify({
        rule_type: rule.rule_type,
        enabled: rule.enabled,
        lead_time_hours: leadHours,
        target_user_id: rule.target_user_id || null,
        target_role: rule.target_role || null,
        title_template: rule.title_template || null,
        body_template: rule.body_template || null,
        min_response_percent:
          rule.min_response_percent === "" || rule.min_response_percent === null
            ? null
            : Number(rule.min_response_percent),
        event_type: rule.event_type || null,
        send_start: rule.send_start || null,
        send_end: rule.send_end || null,
        schedule_start_date: rule.schedule_start_date || null,
        schedule_every: rule.schedule_every || null,
        schedule_time: rule.schedule_time || null,
        cooldown_hours:
          rule.cooldown_hours === "" || rule.cooldown_hours === null ? null : Number(rule.cooldown_hours)
      })
    });

    await load();

    if (closePanel) {
      closeReminderPanel();
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Regel wirklich loschen?")) return;
    await apiFetch(`/api/admin/push-rules/${id}`, { method: "DELETE" });
    closeReminderPanel();
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

  const openReminderPanel = (ruleId: string, panel: "remind" | "repeat" | "audience" | "message") => {
    activeReminderId = ruleId;
    activeReminderPanel = panel;
  };

  const closeReminderPanel = () => {
    activeReminderId = null;
    activeReminderPanel = null;
  };

  const formatLeadSummary = (rule: any) => {
    const unitMap: Record<string, string> = { hours: "Stunde", days: "Tag", weeks: "Woche" };
    const pluralMap: Record<string, string> = { hours: "Stunden", days: "Tage", weeks: "Wochen" };
    const value = Number(rule.lead_value || 1);
    const unit = value === 1 ? unitMap[rule.lead_unit] : pluralMap[rule.lead_unit];
    const eventScope = rule.event_type ? `, nur ${rule.event_type}` : "";
    return `${value} ${unit} vorher${eventScope}`;
  };

  const formatRepeatSummary = (rule: any) => {
    if (!rule.schedule_every) return "Keine Wiederholung";
    const cooldown = Number(rule.cooldown_hours || 0);
    const parts = [repeatLabel(rule.schedule_every)];
    if (cooldown > 0) parts.push(`alle ${cooldown} Stunden`);
    if (rule.schedule_time) parts.push(`um ${rule.schedule_time}`);
    return parts.join(", ");
  };

  const formatAudienceSummary = (rule: any) => {
    const selectedUser = users.find((user) => user.id === rule.target_user_id);
    if (selectedUser) return selectedUser.email;
    return reminderRoleLabel(rule.target_role);
  };

  const formatMessageSummary = (rule: any) => {
    const title = rule.title_template || "Ohne Titel";
    const preview = (rule.body_template || "").trim().replace(/\s+/g, " ");
    if (!preview) return title;
    const shortened = preview.length > 44 ? `${preview.slice(0, 44)}...` : preview;
    return `${title} - ${shortened}`;
  };

  const toggleReminderWindow = (rule: any, enabled: boolean) => {
    reminderWindowEnabled = {
      ...reminderWindowEnabled,
      [rule.id]: enabled
    };
    if (!enabled) {
      rule.send_start = "";
      rule.send_end = "";
    }
  };

  onMount(load);
</script>

<div class="page-stack">
  <section class="page-intro">
    <p class="page-kicker">Admin</p>
    <h1 class="page-title">Systemsteuerung fur Team und Hinweise.</h1>
    <p class="page-description">Rollen, Feature-Flags und Push-Regeln bleiben getrennt und gut lesbar organisiert.</p>
  </section>

  {#if !$session || $session.role !== "admin"}
    <Card title="Kein Zugriff">
      <p class="text-muted">Bitte mit einem Administrationskonto anmelden.</p>
    </Card>
  {:else}
    {#if error}
      <p class="status-banner error">{error}</p>
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
                <span class="text-muted">
                  {item.key === "chat_enabled"
                    ? "Interne Chatraume und Dateianhange fur freigegebene Mitglieder sichtbar machen."
                    : "NFC-Kennungen fur Material anzeigen und schreiben."}
                </span>
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

    <section class="split-grid">
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
          <button class="btn btn-primary" type="button" on:click={saveQuietHours}>Ruhezeiten speichern</button>
        </div>
      </Card>

      <Card title="Push-Test">
        <div class="actions">
          <button class="btn btn-outline" type="button" on:click={sendTestPush}>Test-Benachrichtigung senden</button>
          <button class="btn btn-primary" type="button" on:click={addRule}>Neue Regel</button>
        </div>

        {#if pushTestMessage}
          <p class="status-banner">{pushTestMessage}</p>
        {/if}
      </Card>
    </section>

    <Card title="Push-Regeln">
      <div class="card-grid">
        {#each rules as rule}
          {#if rule.rule_type === "event-reminder"}
            <section class="reminder-settings-page">
              <div class="reminder-hero">
                <div class="reminder-hero__copy">
                  <p class="reminder-hero__kicker">Termin-Erinnerung</p>
                  <h2 class="reminder-hero__title">Erinnerungen ruhig und klar einstellen.</h2>
                  <p class="reminder-hero__text">Die wichtigsten Einstellungen sind als Liste aufgebaut und offnen sich nur bei Bedarf im Detail.</p>
                </div>
                <div class="actions reminder-hero__actions">
                  <button class="btn btn-primary" type="button" on:click={() => updateRule(rule)}>Speichern</button>
                  <button class="btn btn-danger" type="button" on:click={() => deleteRule(rule.id)}>Loschen</button>
                </div>
              </div>

              <div class="reminder-settings-card">
                <div class="reminder-toggle-row">
                  <div class="list-meta">
                    <strong>Erinnerung aktiv</strong>
                    <span class="text-muted">{rule.enabled ? "Die Erinnerung wird derzeit verschickt." : "Die Erinnerung ist pausiert."}</span>
                  </div>
                  <label class="toggle">
                    <input type="checkbox" bind:checked={rule.enabled} />
                  </label>
                </div>

                <SettingsRow
                  first={true}
                  title="Erinnern"
                  subtitle={formatLeadSummary(rule)}
                  on:click={() => openReminderPanel(rule.id, "remind")}
                />
                <SettingsRow
                  title="Wiederholen"
                  subtitle={formatRepeatSummary(rule)}
                  on:click={() => openReminderPanel(rule.id, "repeat")}
                />
                <SettingsRow
                  title="Zielgruppe"
                  subtitle={formatAudienceSummary(rule)}
                  on:click={() => openReminderPanel(rule.id, "audience")}
                />
                <SettingsRow
                  last={true}
                  title="Nachricht"
                  subtitle={formatMessageSummary(rule)}
                  on:click={() => openReminderPanel(rule.id, "message")}
                />
              </div>

              <SlideOverDetail
                open={activeReminderId === rule.id && activeReminderPanel === "remind"}
                title="Wann soll erinnert werden?"
                subtitle="Lege fest, wie fruh die Nachricht vor dem Termin ankommt."
                onClose={closeReminderPanel}
              >
                <div class="detail-group">
                  <div class="field">
                    <label for={`rule-lead-${rule.id}`}>Wie lange vorher?</label>
                    <input id={`rule-lead-${rule.id}`} class="input" type="number" min="1" bind:value={rule.lead_value} />
                  </div>

                  <div class="field">
                    <p class="fieldset-label">Einheit</p>
                    <SegmentedControl bind:value={rule.lead_unit} options={leadUnitOptions} ariaLabel="Einheit fur die Erinnerung" />
                  </div>
                </div>

                <div class="detail-group">
                  <div class="field">
                    <p class="fieldset-label">Fur welche Termine?</p>
                    <SegmentedControl bind:value={rule.event_type} options={eventTypeOptions} ariaLabel="Terminart fur Erinnerung" />
                  </div>
                </div>

                <div class="detail-group">
                  <div class="toggle-row detail-inline-toggle">
                    <div class="list-meta">
                      <strong>Zeitfenster nutzen</strong>
                      <span class="text-muted">Nur in einem ruhigen Zeitraum erinnern.</span>
                    </div>
                    <label class="toggle">
                      <input
                        type="checkbox"
                        checked={reminderWindowEnabled[rule.id] ?? false}
                        on:change={(e) => toggleReminderWindow(rule, e.currentTarget.checked)}
                      />
                    </label>
                  </div>

                  {#if reminderWindowEnabled[rule.id]}
                    <div class="field">
                      <label for={`rule-send-start-${rule.id}`}>Startzeit der Erinnerung</label>
                      <input id={`rule-send-start-${rule.id}`} class="input" type="time" bind:value={rule.send_start} />
                    </div>

                    <div class="field">
                      <label for={`rule-send-end-${rule.id}`}>Endzeit der Erinnerung</label>
                      <input id={`rule-send-end-${rule.id}`} class="input" type="time" bind:value={rule.send_end} />
                    </div>
                  {/if}
                </div>

                <div slot="footer" class="actions reminder-footer">
                  <button class="btn btn-outline" type="button" on:click={closeReminderPanel}>Abbrechen</button>
                  <button class="btn btn-primary" type="button" on:click={() => updateRule(rule, true)}>Speichern</button>
                </div>
              </SlideOverDetail>

              <SlideOverDetail
                open={activeReminderId === rule.id && activeReminderPanel === "repeat"}
                title="Wie soll erinnert werden?"
                subtitle="Wiederholungen bleiben verborgen, bis du sie wirklich brauchst."
                onClose={closeReminderPanel}
              >
                <div class="detail-group">
                  <div class="field">
                    <p class="fieldset-label">Wiederholung</p>
                    <SegmentedControl bind:value={rule.schedule_every} options={repeatOptions} ariaLabel="Wiederholung" />
                  </div>
                </div>

                {#if rule.schedule_every}
                  <div class="detail-group">
                    <div class="field">
                      <label for={`rule-start-date-${rule.id}`}>Ab wann soll die Regel gelten?</label>
                      <input id={`rule-start-date-${rule.id}`} class="input" type="date" bind:value={rule.schedule_start_date} />
                    </div>

                    <div class="field">
                      <label for={`rule-schedule-time-${rule.id}`}>Wann soll gepruft werden?</label>
                      <input id={`rule-schedule-time-${rule.id}`} class="input" type="time" bind:value={rule.schedule_time} />
                    </div>

                    <div class="field">
                      <label for={`rule-cooldown-${rule.id}`}>Erinnerungsintervall</label>
                      <input id={`rule-cooldown-${rule.id}`} class="input" type="number" min="0" bind:value={rule.cooldown_hours} />
                      <p class="hint">So viele Stunden sollen mindestens zwischen zwei Erinnerungen liegen.</p>
                    </div>
                  </div>
                {/if}

                <div slot="footer" class="actions reminder-footer">
                  <button class="btn btn-outline" type="button" on:click={closeReminderPanel}>Abbrechen</button>
                  <button class="btn btn-primary" type="button" on:click={() => updateRule(rule, true)}>Speichern</button>
                </div>
              </SlideOverDetail>

              <SlideOverDetail
                open={activeReminderId === rule.id && activeReminderPanel === "audience"}
                title="Wen mochtest du erinnern?"
                subtitle="Halte die Zielgruppe breit oder richte die Erinnerung an eine einzelne Person."
                onClose={closeReminderPanel}
              >
                <div class="detail-group">
                  <div class="field">
                    <label for={`rule-role-${rule.id}`}>Zielgruppe</label>
                    <select id={`rule-role-${rule.id}`} class="select" bind:value={rule.target_role}>
                      {#each reminderAudienceOptions as option}
                        <option value={option.value}>{option.label}</option>
                      {/each}
                    </select>
                  </div>

                  <div class="field">
                    <label for={`rule-user-${rule.id}`}>Bestimmte Person</label>
                    <select id={`rule-user-${rule.id}`} class="select" bind:value={rule.target_user_id}>
                      <option value="">Nein, an alle passenden Personen senden</option>
                      {#each users as user}
                        <option value={user.id}>{user.email}</option>
                      {/each}
                    </select>
                  </div>
                </div>

                <div slot="footer" class="actions reminder-footer">
                  <button class="btn btn-outline" type="button" on:click={closeReminderPanel}>Abbrechen</button>
                  <button class="btn btn-primary" type="button" on:click={() => updateRule(rule, true)}>Speichern</button>
                </div>
              </SlideOverDetail>

              <SlideOverDetail
                open={activeReminderId === rule.id && activeReminderPanel === "message"}
                title="Wie soll die Nachricht wirken?"
                subtitle="Titel und Text bleiben kurz, freundlich und gut verstandlich."
                onClose={closeReminderPanel}
              >
                <div class="detail-group">
                  <div class="field">
                    <label for={`rule-title-${rule.id}`}>Titel</label>
                    <input
                      id={`rule-title-${rule.id}`}
                      class="input"
                      bind:value={rule.title_template}
                      placeholder="Erinnerung an den nachsten Termin"
                    />
                  </div>

                  <div class="field">
                    <label for={`rule-body-${rule.id}`}>Nachricht</label>
                    <textarea
                      id={`rule-body-${rule.id}`}
                      class="textarea"
                      rows="5"
                      bind:value={rule.body_template}
                      placeholder="Denk bitte kurz an deine Ruckmeldung fur {event.title}."
                    ></textarea>
                    <p class="hint">Platzhalter wie {`{event.title}`} und {`{event.start}`} kannst du weiterhin verwenden.</p>
                  </div>
                </div>

                <div slot="footer" class="actions reminder-footer">
                  <button class="btn btn-outline" type="button" on:click={closeReminderPanel}>Abbrechen</button>
                  <button class="btn btn-primary" type="button" on:click={() => updateRule(rule, true)}>Speichern</button>
                </div>
              </SlideOverDetail>
            </section>
          {:else}
            <Card title={ruleLabel(rule.rule_type)} interactive={true}>
              <div slot="actions" class="actions">
                <span class="badge badge-secondary">{rule.rule_type}</span>
                <label class="toggle">
                  <input type="checkbox" bind:checked={rule.enabled} />
                </label>
                <button class="btn btn-outline" type="button" on:click={() => updateRule(rule)}>Speichern</button>
                <button class="btn btn-danger" type="button" on:click={() => deleteRule(rule.id)}>Loschen</button>
              </div>

              <div class="split-grid">
                <Card title="Zeitraum">
                  <div class="form-grid">
                    <div class="field">
                      <label for={`rule-type-${rule.id}`}>Regeltyp</label>
                      <select id={`rule-type-${rule.id}`} class="select" bind:value={rule.rule_type}>
                        {#each ruleTypes as type}
                          <option value={type.value}>{type.label}</option>
                        {/each}
                        {#if rule.rule_type && !isKnownRuleType(rule.rule_type)}
                          <option value={rule.rule_type}>Benutzerdefiniert</option>
                        {/if}
                      </select>
                    </div>

                    <div class="field">
                      <label for={`rule-send-start-${rule.id}`}>Startzeit der Erinnerung</label>
                      <input id={`rule-send-start-${rule.id}`} class="input" type="time" bind:value={rule.send_start} />
                    </div>

                    <div class="field">
                      <label for={`rule-send-end-${rule.id}`}>Endzeit der Erinnerung</label>
                      <input id={`rule-send-end-${rule.id}`} class="input" type="time" bind:value={rule.send_end} />
                    </div>

                    <div class="field">
                      <p class="fieldset-label">Terminart</p>
                      <SegmentedControl bind:value={rule.event_type} options={eventTypeOptions} ariaLabel="Terminart" />
                    </div>
                  </div>
                </Card>

                <Card title="Wiederholung">
                  <div class="form-grid">
                    <div class="field">
                      <label for={`rule-start-date-${rule.id}`}>Startdatum</label>
                      <input id={`rule-start-date-${rule.id}`} class="input" type="date" bind:value={rule.schedule_start_date} />
                    </div>

                    <div class="field">
                      <p class="fieldset-label">Rhythmus</p>
                      <SegmentedControl bind:value={rule.schedule_every} options={repeatOptions} ariaLabel="Rhythmus" />
                    </div>

                    <div class="field">
                      <label for={`rule-schedule-time-${rule.id}`}>Uhrzeit</label>
                      <input id={`rule-schedule-time-${rule.id}`} class="input" type="time" bind:value={rule.schedule_time} />
                    </div>

                    <div class="field">
                      <label for={`rule-cooldown-${rule.id}`}>Erinnerungsintervall</label>
                      <input id={`rule-cooldown-${rule.id}`} class="input" type="number" min="0" bind:value={rule.cooldown_hours} />
                    </div>

                    {#if !isScheduleRule(rule.rule_type)}
                      <p class="text-muted">Diese Regel wird primar ereignisbasiert ausgelost.</p>
                    {/if}
                  </div>
                </Card>
              </div>

              <div class="split-grid">
                <Card title="Teilnehmer">
                  <div class="form-grid">
                    <div class="field">
                      <p class="fieldset-label">Rolle</p>
                      <SegmentedControl bind:value={rule.target_role} options={roleOptions} ariaLabel="Zielrolle" />
                    </div>

                    <div class="field">
                      <label for={`rule-user-${rule.id}`}>Bestimmter Nutzer</label>
                      <select id={`rule-user-${rule.id}`} class="select" bind:value={rule.target_user_id}>
                        <option value="">Alle Nutzer</option>
                        {#each users as user}
                          <option value={user.id}>{user.email}</option>
                        {/each}
                      </select>
                    </div>

                    {#if rule.rule_type === "availability-missing"}
                      <div class="field">
                        <label for={`rule-min-response-${rule.id}`}>Mindest-Zusagen</label>
                        <input
                          id={`rule-min-response-${rule.id}`}
                          class="input"
                          type="number"
                          min="0"
                          max="100"
                          bind:value={rule.min_response_percent}
                        />
                      </div>
                    {/if}
                  </div>
                </Card>

                <Card title="Nachricht">
                  <div class="form-grid">
                    <div class="field">
                      <label for={`rule-title-${rule.id}`}>Titel</label>
                      <input id={`rule-title-${rule.id}`} class="input" bind:value={rule.title_template} />
                    </div>

                    <div class="field">
                      <label for={`rule-body-${rule.id}`}>Nachricht</label>
                      <textarea id={`rule-body-${rule.id}`} class="textarea" rows="4" bind:value={rule.body_template}></textarea>
                    </div>
                  </div>
                </Card>
              </div>
            </Card>
          {/if}
        {/each}
      </div>
    </Card>
  {/if}
</div>

<style>
  .reminder-settings-page {
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    display: grid;
    gap: 1.4rem;
  }

  .reminder-hero {
    display: grid;
    gap: 1rem;
    padding-top: 0.5rem;
  }

  .reminder-hero__copy {
    display: grid;
    gap: 0.45rem;
  }

  .reminder-hero__kicker {
    color: #007aff;
    font-size: 0.78rem;
    font-weight: 600;
  }

  .reminder-hero__title {
    color: #1d1d1f;
    font-size: clamp(1.8rem, 4vw, 2.35rem);
    line-height: 1.06;
    letter-spacing: -0.03em;
  }

  .reminder-hero__text {
    color: #6e6e73;
    line-height: 1.5;
    max-width: 42rem;
  }

  .reminder-settings-card {
    background: #ffffff;
    border-radius: 18px;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.78),
      0 14px 34px rgba(15, 23, 42, 0.06);
    overflow: hidden;
  }

  .reminder-toggle-row {
    padding: 1rem 1.15rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 1px solid rgba(29, 29, 31, 0.08);
  }

  .detail-group {
    display: grid;
    gap: 0.9rem;
    padding: 1rem;
    border-radius: 18px;
    background: #ffffff;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.78),
      0 10px 28px rgba(15, 23, 42, 0.05);
  }

  .detail-inline-toggle {
    padding: 0.2rem 0;
  }

  .reminder-footer {
    justify-content: flex-end;
  }

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
    .reminder-toggle-row {
      align-items: stretch;
      flex-direction: column;
    }

    .reminder-footer {
      justify-content: stretch;
    }

    .approval-row,
    .approval-actions {
      align-items: stretch;
      flex-direction: column;
    }
  }
</style>
