<script lang="ts">
  import SegmentedControl from "$lib/components/SegmentedControl.svelte";

  export let rule: any;
  export let users: any[] = [];
  export let onSave: ((rule: any) => void | Promise<void>) | undefined = undefined;
  export let onDelete: ((id: string) => void | Promise<void>) | undefined = undefined;
  export let onSend: ((id: string) => void | Promise<void>) | undefined = undefined;

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

  const handleNotificationToggle = (checked: boolean) => {
    rule.notification_type = checked ? "recurring" : "instant";
    if (!checked) {
      rule.is_recurring = false;
      rule.is_active = true;
    }
  };
</script>

<article class="push-rule-card">
  <div class="form-grid">
    <div class="field">
      <label for={`push-title-${rule.id}`}>Titel</label>
      <input id={`push-title-${rule.id}`} class="input" bind:value={rule.title} />
    </div>

    <div class="field">
      <label for={`push-message-${rule.id}`}>Nachricht</label>
      <textarea id={`push-message-${rule.id}`} class="textarea" rows="4" bind:value={rule.message}></textarea>
    </div>

    <div class="field">
      <p class="fieldset-label">Empfänger-Auswahl</p>
      <SegmentedControl bind:value={rule.target_type} options={targetTypeOptions} ariaLabel="Empfängerauswahl" />
    </div>

    {#if rule.target_type === "role"}
      <div class="field">
        <label for={`push-role-${rule.id}`}>Rolle</label>
        <select id={`push-role-${rule.id}`} class="select" bind:value={rule.target_id}>
          {#each roleOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
    {:else if rule.target_type === "user"}
      <div class="field">
        <label for={`push-user-${rule.id}`}>Person</label>
        <select id={`push-user-${rule.id}`} class="select" bind:value={rule.target_id}>
          {#each users as user}
            <option value={user.id}>{user.email}</option>
          {/each}
        </select>
      </div>
    {/if}

    <div class="toggle-row push-rule-toggle">
      <div class="list-meta">
        <strong>Erinnerung</strong>
      </div>
      <label class="toggle">
        <input
          type="checkbox"
          checked={rule.notification_type === "recurring"}
          on:change={(event) => handleNotificationToggle(event.currentTarget.checked)}
        />
      </label>
    </div>

    {#if rule.notification_type === "recurring"}
      <div class="toggle-row push-rule-toggle">
        <div class="list-meta">
          <strong>Wiederholung aktiv</strong>
        </div>
        <label class="toggle">
          <input type="checkbox" bind:checked={rule.is_active} />
        </label>
      </div>

      <div class="field push-rule-interval">
        <label for={`push-interval-value-${rule.id}`}>Intervall</label>
        <div class="push-rule-interval__controls">
          <input
            id={`push-interval-value-${rule.id}`}
            class="input"
            type="number"
            min="1"
            bind:value={rule.interval_value}
          />
          <SegmentedControl bind:value={rule.interval_unit} options={intervalUnitOptions} ariaLabel="Intervall-Einheit" />
        </div>
      </div>

      <div class="split-grid push-rule-dates">
        <div class="field">
          <label for={`push-start-${rule.id}`}>Startdatum</label>
          <input id={`push-start-${rule.id}`} class="input" type="date" bind:value={rule.start_date} />
        </div>
        <div class="field">
          <label for={`push-end-${rule.id}`}>Enddatum</label>
          <input id={`push-end-${rule.id}`} class="input" type="date" bind:value={rule.end_date} />
        </div>
      </div>
    {/if}
  </div>

  <div class="actions push-rule-actions">
    <button class="btn btn-primary" type="button" on:click={() => onSave?.(rule)}>Speichern</button>
    {#if rule.notification_type === "instant"}
      <button class="btn btn-outline" type="button" on:click={() => onSend?.(rule.id)}>Jetzt senden</button>
    {/if}
    <button class="btn btn-danger" type="button" on:click={() => onDelete?.(rule.id)}>Löschen</button>
  </div>
</article>

<style>
  .push-rule-card {
    padding: 1rem;
    border-radius: 18px;
    background: #f8f8fa;
    display: grid;
    gap: 1rem;
  }

  .push-rule-toggle {
    padding: 0.2rem 0;
  }

  .push-rule-interval__controls {
    display: grid;
    gap: 0.75rem;
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
