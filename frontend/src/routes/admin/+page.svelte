<script lang="ts">
  import { onMount } from "svelte";
  import { apiFetch } from "$lib/api";
  import { session } from "$lib/auth";

  let users: any[] = [];
  let settings: any[] = [];
  let rules: any[] = [];
  let error = "";
  let pushTestMessage = "";
  let quietStart = "21:00";
  let quietEnd = "06:00";

  const ruleTypes = [
    { value: "event-reminder", label: "Termin-Erinnerung" },
    { value: "availability-missing", label: "Rückmeldung fehlt" },
    { value: "packlist-missing", label: "Packliste fehlt" },
    { value: "packlist-incomplete", label: "Packliste unvollständig" },
    { value: "event-created", label: "Termin erstellt" },
    { value: "event-updated", label: "Termin geändert" },
    { value: "event-canceled", label: "Termin abgesagt" },
    { value: "inventory-low", label: "Material unter Mindestmenge" },
    { value: "weekly-admin", label: "Wöchentliche Admin-Erinnerung" }
  ];

  const isKnownRuleType = (value: string) => ruleTypes.some((type) => type.value === value);
  const eventTypes = ["", "Gruppenstunde", "Lager", "Aktion", "Sonstiges"];
  const isScheduleRule = (ruleType: string) =>
    ["availability-missing", "packlist-missing", "packlist-incomplete", "weekly-admin", "inventory-low"].includes(
      ruleType
    );

  const inferUnit = (hours: number) => {
    if (hours % 168 === 0) return { value: hours / 168, unit: "weeks" };
    if (hours % 24 === 0) return { value: hours / 24, unit: "days" };
    return { value: hours, unit: "hours" };
  };

  const load = async () => {
    error = "";
    try {
      users = await apiFetch("/api/admin/users");
      settings = await apiFetch("/api/admin/settings");
      rules = (await apiFetch("/api/admin/push-rules")).map((rule: any) => {
        const leadHours = Number(rule.lead_time_hours) || 0;
        const { value, unit } = inferUnit(leadHours);
        return {
          ...rule,
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
      });
      const map = new Map(settings.map((item) => [item.key, item.value]));
      quietStart = map.get("quiet_hours_start") ?? "21:00";
      quietEnd = map.get("quiet_hours_end") ?? "06:00";
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
      pushTestMessage = "Aktion erfolgreich abgeschlossen.";
    } catch {
      pushTestMessage = "Fehlgeschlagen.";
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

  const updateRule = async (rule: any) => {
    const multiplier = rule.lead_unit === "weeks" ? 168 : rule.lead_unit === "days" ? 24 : 1;
    const leadHours =
      rule.rule_type === "event-reminder"
        ? Math.max(1, Number(rule.lead_value || 0) * multiplier)
        : Number(rule.lead_time_hours || 0);
    await apiFetch(`/api/admin/push-rules/${rule.id}`, {
      method: "PUT",
      body: JSON.stringify({
        rule_type: rule.rule_type,
        enabled: rule.enabled === 1 || rule.enabled === true,
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
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Regel wirklich löschen?")) return;
    await apiFetch(`/api/admin/push-rules/${id}`, { method: "DELETE" });
    await load();
  };

  onMount(load);
</script>

<section>
  <h2 class="page-title">Admin</h2>
  {#if !$session || $session.role !== 'admin'}
    <p class="text-muted">Nur für Admins.</p>
  {:else}
    {#if error}
      <div class="card">{error}</div>
    {/if}

    <section class="card-grid grid-2">
      <div class="card">
        <h3 class="section-title">Rollenverwaltung</h3>
        <p class="text-muted">Benutzernamen und Rollen sofort ändern</p>
        <div class="card-grid">
          {#each users as user}
            <div class="actions actions-between">
              <span>{user.email}</span>
              <select class="select" bind:value={user.role} on:change={(e) => updateRole(user.id, e.currentTarget.value)}>
                <option value="user">Nutzer</option>
                <option value="materialwart">Materialwart</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          {/each}
        </div>
      </div>

      <div class="card">
        <h3 class="section-title">Feature-Flags</h3>
        <p class="text-muted">Schalter wirken sofort auf die NFC-Anzeige.</p>
        <div class="form-grid">
          {#each settings as item}
            {#if item.key === 'nfc_enabled'}
              <div class="actions actions-between">
                <div>
                  <strong>NFC aktivieren</strong>
                  <p class="text-muted">
                    NFC-Kennungen für Material anzeigen.
                  </p>
                </div>
                <label class="toggle">
                  <input
                    type="checkbox"
                    checked={item.value === 'true'}
                    on:change={(e) => toggleSetting(item.key, e.currentTarget.checked)}
                  />
                </label>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    </section>

    <section class="card">
      <h3 class="section-title">Ruhezeiten</h3>
      <p class="text-muted">Push-Benachrichtigungen werden in dieser Zeit unterdrückt.</p>
      <div class="form-grid">
        <div class="field">
          <label for="quietStart">Start</label>
          <input id="quietStart" class="input" type="time" bind:value={quietStart} />
        </div>
        <div class="field">
          <label for="quietEnd">Ende</label>
          <input id="quietEnd" class="input" type="time" bind:value={quietEnd} />
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-primary" on:click={saveQuietHours}>Speichern</button>
      </div>
    </section>

    <section class="card">
      <div class="actions actions-between">
        <div>
          <h3 class="section-title">Push-Regeln</h3>
          <p class="text-muted">Regeln für Push-Benachrichtigungen</p>
        </div>
        <div class="actions">
          <button class="btn btn-outline" on:click={sendTestPush}>Test-Benachrichtigung</button>
          <button class="btn btn-outline" on:click={addRule}>Neue Regel</button>
        </div>
      </div>
      {#if pushTestMessage}
        <p class="text-muted">{pushTestMessage}</p>
      {/if}
      <div class="card-grid">
        {#each rules as rule}
          <div class="card">
            <div class="actions actions-between">
              <select class="select" bind:value={rule.rule_type}>
                {#each ruleTypes as type}
                  <option value={type.value}>{type.label}</option>
                {/each}
                {#if rule.rule_type && !isKnownRuleType(rule.rule_type)}
                  <option value={rule.rule_type}>Benutzerdefiniert</option>
                {/if}
              </select>
            <label class="toggle">
              <input type="checkbox" bind:checked={rule.enabled} /> Aktiv
            </label>
            {#if rule.rule_type === "event-reminder"}
              <input class="input" type="number" min="1" bind:value={rule.lead_value} />
              <select class="select" bind:value={rule.lead_unit}>
                <option value="hours">Stunden</option>
                <option value="days">Tage</option>
                <option value="weeks">Wochen</option>
              </select>
            {/if}
            <select class="select" bind:value={rule.target_role}>
              <option value="">Alle Rollen</option>
              <option value="user">Nutzer</option>
              <option value="materialwart">Materialwart</option>
              <option value="admin">Admin</option>
            </select>
              <select class="select" bind:value={rule.target_user_id}>
                <option value="">Alle Nutzer</option>
                {#each users as user}
                  <option value={user.id}>{user.email}</option>
                {/each}
              </select>
              <div class="actions">
                <button class="btn btn-primary" on:click={() => updateRule(rule)}>Speichern</button>
                <button class="btn btn-danger" on:click={() => deleteRule(rule.id)}>Löschen</button>
              </div>
            </div>
            <div class="form-grid">
              <div class="field">
                <label for={`rule-${rule.id}-send-start`}>Fenster-Start</label>
                <input id={`rule-${rule.id}-send-start`} class="input" type="time" bind:value={rule.send_start} />
              </div>
              <div class="field">
                <label for={`rule-${rule.id}-send-end`}>Fenster-Ende</label>
                <input id={`rule-${rule.id}-send-end`} class="input" type="time" bind:value={rule.send_end} />
              </div>
              <div class="field">
                <label for={`rule-${rule.id}-cooldown`}>Cooldown (Stunden)</label>
                <input
                  id={`rule-${rule.id}-cooldown`}
                  class="input"
                  type="number"
                  min="0"
                  bind:value={rule.cooldown_hours}
                />
              </div>
              <div class="field">
                <label for={`rule-${rule.id}-event-type`}>Event-Typ</label>
                <select id={`rule-${rule.id}-event-type`} class="select" bind:value={rule.event_type}>
                  {#each eventTypes as type}
                    <option value={type}>{type === "" ? "Alle Typen" : type}</option>
                  {/each}
                </select>
              </div>
              {#if rule.rule_type === "availability-missing"}
                <div class="field">
                  <label for={`rule-${rule.id}-min-response`}>Min. Rückmeldungen (%)</label>
                  <input
                    id={`rule-${rule.id}-min-response`}
                    class="input"
                    type="number"
                    min="0"
                    max="100"
                    bind:value={rule.min_response_percent}
                  />
                </div>
              {/if}
              {#if isScheduleRule(rule.rule_type)}
                <div class="field">
                  <label for={`rule-${rule.id}-start-date`}>Startdatum</label>
                  <input
                    id={`rule-${rule.id}-start-date`}
                    class="input"
                    type="date"
                    bind:value={rule.schedule_start_date}
                  />
                </div>
                <div class="field">
                  <label for={`rule-${rule.id}-schedule-every`}>Rhythmus</label>
                  <select id={`rule-${rule.id}-schedule-every`} class="select" bind:value={rule.schedule_every}>
                    <option value="">Kein Rhythmus</option>
                    <option value="daily">Täglich</option>
                    <option value="weekly">Wöchentlich</option>
                    <option value="monthly">Monatlich</option>
                  </select>
                </div>
                <div class="field">
                  <label for={`rule-${rule.id}-schedule-time`}>Uhrzeit</label>
                  <input
                    id={`rule-${rule.id}-schedule-time`}
                    class="input"
                    type="time"
                    bind:value={rule.schedule_time}
                  />
                </div>
              {/if}
            </div>
            <div class="form-grid">
              <div class="field">
                <label for={`rule-${rule.id}-title-template`}>Titel (Template)</label>
                <input
                  id={`rule-${rule.id}-title-template`}
                  class="input"
                  bind:value={rule.title_template}
                  placeholder="z. B. Termin-Erinnerung"
                />
              </div>
              <div class="field">
                <label for={`rule-${rule.id}-body-template`}>Text (Template)</label>
                <textarea
                  id={`rule-${rule.id}-body-template`}
                  class="input"
                  rows="3"
                  bind:value={rule.body_template}
                ></textarea>
              </div>
            </div>
            <p class="text-muted">
              Variablen: {`{event.title}`}, {`{event.start}`}, {`{event.end}`}, {`{event.type}`}, {`{event.location}`},
              {`{user.name}`}, {`{user.role}`}, {`{item.name}`}, {`{item.quantity}`}, {`{item.min_quantity}`}
            </p>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</section>
