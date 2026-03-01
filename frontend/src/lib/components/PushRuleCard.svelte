<script lang="ts">
  import SegmentedControl from "$lib/components/SegmentedControl.svelte";
  import { hasUnsafePattern, sanitizeMultilineText, sanitizeText } from "$lib/forms";

  export let rule: any;
  export let users: any[] = [];
  export let onSave: ((rule: any) => void | Promise<void>) | undefined = undefined;
  export let onDelete: ((id: string) => void | Promise<void>) | undefined = undefined;
  export let onSend: ((id: string) => void | Promise<{ delivered?: number; skipped?: number } | void>) | undefined =
    undefined;

  let fieldErrors: { title?: string; message?: string; target_id?: string; interval_value?: string; end_date?: string } = {};
  let actionError = "";
  let actionSuccess = "";
  let saveLoading = false;
  let sendLoading = false;
  let deleteLoading = false;

  const targetTypeOptions = [
    { value: "all", label: "Alle" },
    { value: "role", label: "Rolle" },
    { value: "user", label: "Person" }
  ];

  const intervalUnitOptions = [
    { value: "hours", label: "Stunden" },
    { value: "days", label: "Tage" },
    { value: "weeks", label: "Wochen" }
  ];

  const roleOptions = [
    { value: "user", label: "Nutzer" },
    { value: "materialwart", label: "Materialwart" },
    { value: "admin", label: "Admin" }
  ];

  const validate = () => {
    fieldErrors = {};
    actionError = "";
    actionSuccess = "";

    const sanitizedTitle = sanitizeText(String(rule.title ?? ""), 160);
    const sanitizedMessage = sanitizeMultilineText(String(rule.message ?? ""), 1200);
    rule.title = sanitizedTitle;
    rule.message = sanitizedMessage;

    if (!sanitizedTitle) fieldErrors.title = "Titel erforderlich.";
    else if (hasUnsafePattern(sanitizedTitle)) fieldErrors.title = "Ungultige Zeichenfolge.";

    if (!sanitizedMessage) fieldErrors.message = "Nachricht erforderlich.";
    else if (hasUnsafePattern(sanitizedMessage)) fieldErrors.message = "Ungultige Zeichenfolge.";

    if (rule.target_type !== "all" && !String(rule.target_id ?? "").trim()) {
      fieldErrors.target_id = "Empfanger erforderlich.";
    }

    if (rule.notification_type === "recurring") {
      const intervalValue = Number(rule.interval_value);
      if (!Number.isFinite(intervalValue) || intervalValue < 1) {
        fieldErrors.interval_value = "Intervall >= 1 erforderlich.";
      }
      if (rule.start_date && rule.end_date && rule.end_date < rule.start_date) {
        fieldErrors.end_date = "Enddatum muss nach Startdatum liegen.";
      }
    }

    return Object.keys(fieldErrors).length === 0;
  };

  const handleSave = async () => {
    if (saveLoading) return;
    if (!validate()) {
      actionError = "Eingaben prufen.";
      return;
    }

    saveLoading = true;
    try {
      await onSave?.(rule);
      actionSuccess = "Regel gespeichert.";
    } catch (err) {
      actionError = err instanceof Error ? err.message : "Speichern fehlgeschlagen.";
    } finally {
      saveLoading = false;
    }
  };

  const handleSendNow = async () => {
    if (sendLoading) return;
    if (!validate()) {
      actionError = "Eingaben prufen.";
      return;
    }

    sendLoading = true;
    try {
      const result = await onSend?.(rule.id);
      const delivered = Number(result?.delivered ?? 0);
      const skipped = Number(result?.skipped ?? 0);
      if (Number.isFinite(delivered) || Number.isFinite(skipped)) {
        actionSuccess = `Gesendet: ${delivered} | Ubersprungen: ${skipped}`;
      } else {
        actionSuccess = "Push gesendet.";
      }
    } catch (err) {
      actionError = err instanceof Error ? err.message : "Senden fehlgeschlagen.";
    } finally {
      sendLoading = false;
    }
  };

  const handleDelete = async () => {
    if (deleteLoading) return;
    deleteLoading = true;
    actionError = "";
    try {
      await onDelete?.(rule.id);
    } catch (err) {
      actionError = err instanceof Error ? err.message : "Loschen fehlgeschlagen.";
    } finally {
      deleteLoading = false;
    }
  };

  const formatLastExecuted = (value: string | null | undefined) => {
    if (!value) return "Noch nie";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unbekannt";
    return date.toLocaleString("de-DE");
  };
</script>

<article class="push-rule-card">
  <div class="form-grid">
    <div class="toggle-row push-rule-toggle">
      <div class="list-meta">
        <strong>Aktiv</strong>
      </div>
      <label class="toggle">
        <input type="checkbox" bind:checked={rule.is_active} />
      </label>
    </div>

    <div class="field">
      <p class="fieldset-label">Regeltyp</p>
      <SegmentedControl
        bind:value={rule.notification_type}
        options={[
          { value: "instant", label: "Sofort" },
          { value: "recurring", label: "Wiederkehrend" }
        ]}
        ariaLabel="Regeltyp"
      />
    </div>

    <div class="field">
      <label for={`push-title-${rule.id}`}>Titel</label>
      <input
        id={`push-title-${rule.id}`}
        class="input"
        class:input-invalid={Boolean(fieldErrors.title)}
        bind:value={rule.title}
        maxlength="160"
        required
      />
      {#if fieldErrors.title}
        <p class="field-error">{fieldErrors.title}</p>
      {/if}
    </div>

    <div class="field">
      <label for={`push-message-${rule.id}`}>Nachricht</label>
      <textarea
        id={`push-message-${rule.id}`}
        class="textarea"
        class:input-invalid={Boolean(fieldErrors.message)}
        rows="4"
        bind:value={rule.message}
        maxlength="1200"
        required
      ></textarea>
      {#if fieldErrors.message}
        <p class="field-error">{fieldErrors.message}</p>
      {/if}
    </div>

    <div class="field">
      <p class="fieldset-label">Empfanger-Auswahl</p>
      <SegmentedControl bind:value={rule.target_type} options={targetTypeOptions} ariaLabel="Empfangerauswahl" />
    </div>

    {#if rule.target_type === "role"}
      <div class="field">
        <label for={`push-role-${rule.id}`}>Rolle</label>
        <select id={`push-role-${rule.id}`} class="select" class:input-invalid={Boolean(fieldErrors.target_id)} bind:value={rule.target_id}>
          {#each roleOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
        {#if fieldErrors.target_id}
          <p class="field-error">{fieldErrors.target_id}</p>
        {/if}
      </div>
    {:else if rule.target_type === "user"}
      <div class="field">
        <label for={`push-user-${rule.id}`}>Person</label>
        <select id={`push-user-${rule.id}`} class="select" class:input-invalid={Boolean(fieldErrors.target_id)} bind:value={rule.target_id}>
          {#each users as user}
            <option value={user.id}>{user.email}</option>
          {/each}
        </select>
        {#if fieldErrors.target_id}
          <p class="field-error">{fieldErrors.target_id}</p>
        {/if}
      </div>
    {/if}

    <div class="toggle-row push-rule-toggle">
      <div class="list-meta">
        <strong>Zuletzt ausgefuhrt</strong>
        <span class="text-muted">{formatLastExecuted(rule.last_sent_at)}</span>
      </div>
    </div>

    {#if rule.notification_type === "recurring"}
      <div class="field push-rule-interval">
        <label for={`push-interval-value-${rule.id}`}>Intervall</label>
        <div class="push-rule-interval__controls">
          <input
            id={`push-interval-value-${rule.id}`}
            class="input"
            class:input-invalid={Boolean(fieldErrors.interval_value)}
            type="number"
            min="1"
            bind:value={rule.interval_value}
          />
          <SegmentedControl bind:value={rule.interval_unit} options={intervalUnitOptions} ariaLabel="Intervall-Einheit" />
        </div>
        {#if fieldErrors.interval_value}
          <p class="field-error">{fieldErrors.interval_value}</p>
        {/if}
      </div>

      <div class="split-grid push-rule-dates">
        <div class="field">
          <label for={`push-start-${rule.id}`}>Startdatum</label>
          <input id={`push-start-${rule.id}`} class="input" type="date" bind:value={rule.start_date} />
        </div>
        <div class="field">
          <label for={`push-end-${rule.id}`}>Enddatum</label>
          <input id={`push-end-${rule.id}`} class="input" class:input-invalid={Boolean(fieldErrors.end_date)} type="date" bind:value={rule.end_date} />
          {#if fieldErrors.end_date}
            <p class="field-error">{fieldErrors.end_date}</p>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  {#if actionError}
    <p class="status-banner error">{actionError}</p>
  {/if}
  {#if actionSuccess}
    <p class="status-banner success">{actionSuccess}</p>
  {/if}

  <div class="actions push-rule-actions">
    <button class="btn btn-primary" type="button" on:click={handleSave} disabled={saveLoading || sendLoading || deleteLoading}>
      {#if saveLoading}
        <span class="btn-spinner" aria-hidden="true"></span>
      {/if}
      {saveLoading ? "Speichern..." : "Speichern"}
    </button>
    <button class="btn btn-outline" type="button" on:click={handleSendNow} disabled={saveLoading || sendLoading || deleteLoading || !rule.is_active}>
      {#if sendLoading}
        <span class="btn-spinner" aria-hidden="true"></span>
      {/if}
      {sendLoading ? "Senden..." : "Jetzt senden"}
    </button>
    <button class="btn btn-danger" type="button" on:click={handleDelete} disabled={saveLoading || sendLoading || deleteLoading}>
      {#if deleteLoading}
        <span class="btn-spinner" aria-hidden="true"></span>
      {/if}
      {deleteLoading ? "Loschen..." : "Loschen"}
    </button>
  </div>
</article>

<style>
  .push-rule-card {
    padding: var(--space-2) 0;
    border-top: 1px solid var(--surface-border);
    display: grid;
    gap: var(--space-2);
  }

  .push-rule-toggle {
    padding: 0;
  }

  .push-rule-interval__controls {
    display: grid;
    gap: var(--space-1);
  }

  .push-rule-actions {
    justify-content: flex-end;
  }

  @media (max-width: 720px) {
    .push-rule-actions {
      justify-content: stretch;
    }
  }
</style>
