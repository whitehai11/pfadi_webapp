<script lang="ts">
  import { onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import SegmentedControl from "$lib/components/SegmentedControl.svelte";
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

  const scheduleOptions = [
    { value: "", label: "Kein" },
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
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Regel wirklich loschen?")) return;
    await apiFetch(`/api/admin/push-rules/${id}`, { method: "DELETE" });
    await load();
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
    <Card title="Kein Zugriff" description="Dieser Bereich ist nur fur Admins sichtbar.">
      <p class="text-muted">Bitte mit einem Administrationskonto anmelden.</p>
    </Card>
  {:else}
    {#if error}
      <p class="status-banner error">{error}</p>
    {/if}

    <section class="split-grid">
      <Card title="Rollenverwaltung" description="Rollen konnen direkt und ohne Seitenwechsel angepasst werden.">
        <div class="hairline-list">
          {#each users as user}
            <div class="list-row">
              <div class="list-meta">
                <strong>{user.email}</strong>
                <span class="text-muted">Benutzerrolle</span>
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

      <Card title="Feature-Flags" description="Systemschalter beeinflussen Verhalten direkt nach dem Speichern.">
        {#each settings as item}
          {#if item.key === "nfc_enabled"}
            <div class="toggle-row">
              <div class="list-meta">
                <strong>NFC aktivieren</strong>
                <span class="text-muted">NFC-Kennungen fur Material anzeigen und schreiben.</span>
              </div>
              <label class="toggle">
                <input
                  type="checkbox"
                  checked={item.value === "true"}
                  on:change={(e) => toggleSetting(item.key, e.currentTarget.checked)}
                />
              </label>
            </div>
          {/if}
        {/each}
      </Card>
    </section>

    <section class="split-grid">
      <Card title="Ruhezeiten" description="In diesem Zeitraum werden Benachrichtigungen nicht versendet.">
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

      <Card title="Push-Test" description="Prufe, ob Benachrichtigungen am Gerat ankommen.">
        <div class="actions">
          <button class="btn btn-outline" type="button" on:click={sendTestPush}>Test-Benachrichtigung senden</button>
          <button class="btn btn-primary" type="button" on:click={addRule}>Neue Regel</button>
        </div>

        {#if pushTestMessage}
          <p class="status-banner">{pushTestMessage}</p>
        {/if}
      </Card>
    </section>

    <Card title="Push-Regeln" description="Jede Regel bleibt in vier klare Abschnitte gegliedert.">
      <div class="card-grid">
        {#each rules as rule}
          <Card title={ruleLabel(rule.rule_type)} description="Erinnerungen und Trigger fur Termine, Material und Packlisten." interactive={true}>
            <div slot="actions" class="actions">
              <span class="badge badge-secondary">{rule.rule_type}</span>
              <div class="toggle-row reminder-toggle">
                <div class="list-meta">
                  <strong>Erinnerung aktiv</strong>
                  <span class="text-muted">Nur aktive Erinnerungen werden verschickt.</span>
                </div>
                <label class="toggle">
                  <input type="checkbox" bind:checked={rule.enabled} />
                </label>
              </div>
              <button class="btn btn-outline" type="button" on:click={() => updateRule(rule)}>Speichern</button>
              <button class="btn btn-danger" type="button" on:click={() => deleteRule(rule.id)}>Loschen</button>
            </div>

            {#if rule.rule_type === "event-reminder"}
              <div class="split-grid reminder-form">
                <Card title="Zeitraum" description="Lege fest, auf welche Termine sich die Erinnerung bezieht und wie fruh sie ankommen soll.">
                  <div class="form-grid">
                    <div class="field">
                      <label for={`rule-lead-${rule.id}`}>Wie lange vorher soll erinnert werden?</label>
                      <input id={`rule-lead-${rule.id}`} class="input" type="number" min="1" bind:value={rule.lead_value} />
                      <p class="hint">Die Erinnerung wird vor dem Termin zu diesem Zeitpunkt verschickt.</p>
                    </div>

                    <div class="field">
                      <p class="fieldset-label">Zeiteinheit</p>
                      <SegmentedControl bind:value={rule.lead_unit} options={leadUnitOptions} ariaLabel="Zeiteinheit fur Vorlauf" />
                    </div>

                    <div class="field">
                      <p class="fieldset-label">Welche Termine sollen berucksichtigt werden?</p>
                      <SegmentedControl bind:value={rule.event_type} options={eventTypeOptions} ariaLabel="Terminart" />
                      <p class="hint">Wenn du nichts einschrankst, gilt die Erinnerung fur alle Terminarten.</p>
                    </div>
                  </div>
                </Card>

                <Card title="Erinnerung" description="Hier bestimmst du, wann die Nachricht verschickt werden darf und wie oft sie wiederkommt.">
                  <div class="form-grid">
                    <div class="field">
                      <label for={`rule-send-start-${rule.id}`}>Ab wann darf die Erinnerung verschickt werden?</label>
                      <input id={`rule-send-start-${rule.id}`} class="input" type="time" bind:value={rule.send_start} />
                    </div>

                    <div class="field">
                      <label for={`rule-send-end-${rule.id}`}>Bis wann darf sie verschickt werden?</label>
                      <input id={`rule-send-end-${rule.id}`} class="input" type="time" bind:value={rule.send_end} />
                    </div>

                    <div class="field">
                      <label for={`rule-cooldown-${rule.id}`}>Wie oft soll erinnert werden?</label>
                      <input
                        id={`rule-cooldown-${rule.id}`}
                        class="input"
                        type="number"
                        min="0"
                        bind:value={rule.cooldown_hours}
                      />
                      <p class="hint">Gib an, wie viele Stunden zwischen zwei Erinnerungen mindestens liegen sollen.</p>
                    </div>

                    <div class="field">
                      <label for={`rule-start-date-${rule.id}`}>Ab welchem Datum soll die Regel gelten?</label>
                      <input
                        id={`rule-start-date-${rule.id}`}
                        class="input"
                        type="date"
                        bind:value={rule.schedule_start_date}
                      />
                    </div>

                    <div class="field">
                      <p class="fieldset-label">Wie regelmassig soll gepruft werden?</p>
                      <SegmentedControl bind:value={rule.schedule_every} options={scheduleOptions} ariaLabel="Rhythmus" />
                    </div>

                    <div class="field">
                      <label for={`rule-schedule-time-${rule.id}`}>Zu welcher Uhrzeit soll gepruft werden?</label>
                      <input
                        id={`rule-schedule-time-${rule.id}`}
                        class="input"
                        type="time"
                        bind:value={rule.schedule_time}
                      />
                    </div>
                  </div>
                </Card>

                <Card title="Zielgruppe" description="Bestimme, wen die Erinnerung erreicht. Du kannst alle oder nur einzelne Personen ansprechen.">
                  <div class="form-grid">
                    <div class="field">
                      <label for={`rule-role-${rule.id}`}>Wen mochtest du erinnern?</label>
                      <select id={`rule-role-${rule.id}`} class="select" bind:value={rule.target_role}>
                        {#each reminderAudienceOptions as option}
                          <option value={option.value}>{option.label}</option>
                        {/each}
                      </select>
                      <p class="hint">Aktuell ausgewahlt: {reminderRoleLabel(rule.target_role)}</p>
                    </div>

                    <div class="field">
                      <label for={`rule-user-${rule.id}`}>Nur eine bestimmte Person erinnern?</label>
                      <select id={`rule-user-${rule.id}`} class="select" bind:value={rule.target_user_id}>
                        <option value="">Nein, an alle passenden Personen senden</option>
                        {#each users as user}
                          <option value={user.id}>{user.email}</option>
                        {/each}
                      </select>
                    </div>
                  </div>
                </Card>

                <Card title="Nachricht" description="Schreibe den Ton so, wie du ihn selbst gern erhalten wurdest: klar, freundlich und direkt.">
                  <div class="form-grid">
                    <div class="field">
                      <label for={`rule-title-${rule.id}`}>Wie soll die Erinnerung heissen?</label>
                      <input
                        id={`rule-title-${rule.id}`}
                        class="input"
                        bind:value={rule.title_template}
                        placeholder="z. B. Erinnerung an den nachsten Termin"
                      />
                    </div>

                    <div class="field">
                      <label for={`rule-body-${rule.id}`}>Was mochtest du den Teilnehmenden sagen?</label>
                      <textarea
                        id={`rule-body-${rule.id}`}
                        class="textarea"
                        rows="4"
                        bind:value={rule.body_template}
                        placeholder="z. B. Denk bitte daran, uns kurz Bescheid zu geben, ob du dabei bist."
                      ></textarea>
                      <p class="hint">Du kannst Platzhalter wie {`{event.title}`} oder {`{event.start}`} verwenden.</p>
                    </div>
                  </div>
                </Card>
              </div>
            {:else}
              <div class="split-grid">
                <Card title="Zeitraum" description="Wann die Erinnerung greift und in welchem Kontext sie gilt.">
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
                      <label for={`rule-send-start-${rule.id}`}>Start der Erinnerung</label>
                      <input id={`rule-send-start-${rule.id}`} class="input" type="time" bind:value={rule.send_start} />
                    </div>

                    <div class="field">
                      <label for={`rule-send-end-${rule.id}`}>Ende der Erinnerung</label>
                      <input id={`rule-send-end-${rule.id}`} class="input" type="time" bind:value={rule.send_end} />
                    </div>

                    <div class="field">
                      <p class="fieldset-label">Terminart</p>
                      <SegmentedControl bind:value={rule.event_type} options={eventTypeOptions} ariaLabel="Terminart" />
                    </div>
                  </div>
                </Card>

                <Card title="Wiederholung" description="Rhythmus, Startdatum und Erinnerungsintervall.">
                  <div class="form-grid">
                    <div class="field">
                      <label for={`rule-start-date-${rule.id}`}>Startdatum</label>
                      <input
                        id={`rule-start-date-${rule.id}`}
                        class="input"
                        type="date"
                        bind:value={rule.schedule_start_date}
                      />
                    </div>

                    <div class="field">
                      <p class="fieldset-label">Rhythmus</p>
                      <SegmentedControl bind:value={rule.schedule_every} options={scheduleOptions} ariaLabel="Rhythmus" />
                    </div>

                    <div class="field">
                      <label for={`rule-schedule-time-${rule.id}`}>Uhrzeit</label>
                      <input
                        id={`rule-schedule-time-${rule.id}`}
                        class="input"
                        type="time"
                        bind:value={rule.schedule_time}
                      />
                    </div>

                    <div class="field">
                      <label for={`rule-cooldown-${rule.id}`}>Erinnerungsintervall (Stunden)</label>
                      <input
                        id={`rule-cooldown-${rule.id}`}
                        class="input"
                        type="number"
                        min="0"
                        bind:value={rule.cooldown_hours}
                      />
                    </div>

                    {#if !isScheduleRule(rule.rule_type)}
                      <p class="text-muted">Diese Regel wird primar ereignisbasiert ausgelost.</p>
                    {/if}
                  </div>
                </Card>
              </div>

              <div class="split-grid">
                <Card title="Teilnehmer" description="Fur wen die Nachricht gedacht ist.">
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
                        <label for={`rule-min-response-${rule.id}`}>Mindest-Zusagen (%)</label>
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

                <Card title="Nachricht" description="Titel und Text der Benachrichtigung.">
                  <div class="form-grid">
                    <div class="field">
                      <label for={`rule-title-${rule.id}`}>Titel</label>
                      <input
                        id={`rule-title-${rule.id}`}
                        class="input"
                        bind:value={rule.title_template}
                        placeholder="z. B. Termin-Erinnerung"
                      />
                    </div>

                    <div class="field">
                      <label for={`rule-body-${rule.id}`}>Nachricht</label>
                      <textarea id={`rule-body-${rule.id}`} class="textarea" rows="4" bind:value={rule.body_template}></textarea>
                    </div>
                  </div>

                  <div class="rule-template-list text-muted">
                    <span>Variablen: {`{event.title}`}, {`{event.start}`}, {`{event.end}`}, {`{event.type}`}, {`{event.location}`}</span>
                    <span>{`{user.name}`}, {`{user.role}`}, {`{item.name}`}, {`{item.quantity}`}, {`{item.min_quantity}`}</span>
                  </div>
                </Card>
              </div>
            {/if}
          </Card>
        {/each}
      </div>
    </Card>
  {/if}
</div>

<style>
  .reminder-form {
    gap: 1rem;
  }

  .reminder-toggle {
    padding: 0.55rem 0.75rem;
    border-radius: 14px;
    background: rgba(29, 29, 31, 0.04);
  }
</style>
