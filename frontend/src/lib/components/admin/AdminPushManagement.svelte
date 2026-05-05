<script lang="ts">
  import { onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import { apiFetch } from "$lib/api";
  import { pushToast } from "$lib/toast";

  type PushRule = {
    id: string;
    title: string | null;
    message: string | null;
    is_active: number;
    notification_type: "instant" | "recurring";
    target_type: "all" | "role" | "user";
    target_id: string | null;
    interval_value: number | null;
    interval_unit: "hours" | "days" | "weeks" | null;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
    last_sent_at: string | null;
  };

  let loading = true;
  let rules: PushRule[] = [];
  let sendingId = "";
  let deletingId = "";
  let creating = false;

  // form state
  let form = {
    title: "",
    message: "",
    notification_type: "instant" as "instant" | "recurring",
    target_type: "all" as "all" | "role" | "user",
    target_id: "",
    is_active: true,
    interval_value: 1,
    interval_unit: "days" as "hours" | "days" | "weeks",
    start_date: "",
    end_date: ""
  };

  const resetForm = () => {
    form = {
      title: "",
      message: "",
      notification_type: "instant",
      target_type: "all",
      target_id: "",
      is_active: true,
      interval_value: 1,
      interval_unit: "days",
      start_date: "",
      end_date: ""
    };
  };

  const load = async () => {
    loading = true;
    try {
      rules = await apiFetch<PushRule[]>("/api/admin/push-rules");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Push-Regeln konnten nicht geladen werden.", "error");
    } finally {
      loading = false;
    }
  };

  const createRule = async () => {
    if (creating) return;
    if (!form.title.trim() || !form.message.trim()) {
      pushToast("Titel und Nachricht sind Pflichtfelder.", "error");
      return;
    }
    creating = true;
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        message: form.message.trim(),
        notification_type: form.notification_type,
        target_type: form.target_type,
        is_active: form.is_active
      };
      if (form.target_type !== "all") body.target_id = form.target_id.trim() || null;
      if (form.notification_type === "recurring") {
        body.interval_value = form.interval_value;
        body.interval_unit = form.interval_unit;
        if (form.start_date) body.start_date = form.start_date;
        if (form.end_date) body.end_date = form.end_date;
      }
      await apiFetch("/api/admin/push-rules", { method: "POST", body: JSON.stringify(body) });
      pushToast("Regel erstellt.", "success", 900);
      resetForm();
      await load();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Erstellen fehlgeschlagen.", "error");
    } finally {
      creating = false;
    }
  };

  const sendNow = async (id: string) => {
    if (sendingId) return;
    sendingId = id;
    try {
      await apiFetch(`/api/admin/push-rules/${id}/send`, { method: "POST" });
      pushToast("Push wurde gesendet.", "success", 900);
      await load();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Senden fehlgeschlagen.", "error");
    } finally {
      sendingId = "";
    }
  };

  const removeRule = async (id: string) => {
    if (deletingId) return;
    deletingId = id;
    try {
      await apiFetch(`/api/admin/push-rules/${id}`, { method: "DELETE" });
      pushToast("Regel gelöscht.", "success", 900);
      await load();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Löschen fehlgeschlagen.", "error");
    } finally {
      deletingId = "";
    }
  };

  const fmtDate = (value: string | null) => {
    if (!value) return "-";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return "-";
    return dt.toLocaleString("de-DE");
  };

  const targetLabel = (rule: PushRule) => {
    if (rule.target_type === "all") return "Alle";
    if (rule.target_type === "role") return `Rolle: ${rule.target_id ?? "?"}`;
    return `User: ${rule.target_id ?? "?"}`;
  };

  onMount(() => {
    void load();
  });
</script>

<section class="section-block">
  <h2 class="section-title">Push-Verwaltung</h2>

  <Card title="Neue Regel erstellen">
    <div class="rule-form">
      <div class="form-row">
        <div class="form-group">
          <label for="rule-title">Titel</label>
          <input id="rule-title" class="input" type="text" placeholder="z.B. Wöchentliche Erinnerung" bind:value={form.title} maxlength="160" />
        </div>
        <div class="form-group">
          <label for="rule-type">Typ</label>
          <select id="rule-type" class="input" bind:value={form.notification_type}>
            <option value="instant">Einmalig (sofort)</option>
            <option value="recurring">Wiederkehrend</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label for="rule-message">Nachricht</label>
        <textarea id="rule-message" class="input textarea" rows="3" placeholder="Inhalt der Push-Benachrichtigung..." bind:value={form.message} maxlength="1200"></textarea>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="rule-target">Zielgruppe</label>
          <select id="rule-target" class="input" bind:value={form.target_type}>
            <option value="all">Alle</option>
            <option value="role">Nach Rolle</option>
            <option value="user">Einzelner User</option>
          </select>
        </div>
        {#if form.target_type !== "all"}
          <div class="form-group">
            <label for="rule-target-id">{form.target_type === "role" ? "Rolle" : "User-ID"}</label>
            <input id="rule-target-id" class="input" type="text" placeholder={form.target_type === "role" ? "z.B. admin" : "User-ID"} bind:value={form.target_id} maxlength="120" />
          </div>
        {/if}
        <div class="form-group form-group-narrow">
          <label for="rule-active">Status</label>
          <select id="rule-active" class="input" bind:value={form.is_active}>
            <option value={true}>Aktiv</option>
            <option value={false}>Inaktiv</option>
          </select>
        </div>
      </div>

      {#if form.notification_type === "recurring"}
        <div class="form-row">
          <div class="form-group form-group-narrow">
            <label for="rule-interval-val">Alle</label>
            <input id="rule-interval-val" class="input" type="number" min="1" max="8760" bind:value={form.interval_value} />
          </div>
          <div class="form-group form-group-narrow">
            <label for="rule-interval-unit">Einheit</label>
            <select id="rule-interval-unit" class="input" bind:value={form.interval_unit}>
              <option value="hours">Stunden</option>
              <option value="days">Tage</option>
              <option value="weeks">Wochen</option>
            </select>
          </div>
          <div class="form-group">
            <label for="rule-start">Start (optional)</label>
            <input id="rule-start" class="input" type="date" bind:value={form.start_date} />
          </div>
          <div class="form-group">
            <label for="rule-end">Ende (optional)</label>
            <input id="rule-end" class="input" type="date" bind:value={form.end_date} />
          </div>
        </div>
      {/if}

      <button class="btn btn-primary" type="button" on:click={createRule} disabled={creating}>
        {creating ? "Erstelle..." : "Regel erstellen"}
      </button>
    </div>
  </Card>

  <Card title="Push-Regeln">
    {#if loading}
      <p class="text-muted">Lade Regeln...</p>
    {:else if rules.length === 0}
      <p class="text-muted">Keine Regeln vorhanden.</p>
    {:else}
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Titel</th>
              <th>Typ</th>
              <th>Zielgruppe</th>
              <th>Zuletzt gesendet</th>
              <th>Status</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {#each rules as rule}
              <tr>
                <td>
                  <div class="rule-title">{rule.title || "Ohne Titel"}</div>
                  {#if rule.message}
                    <div class="rule-preview">{rule.message.length > 60 ? rule.message.slice(0, 60) + "…" : rule.message}</div>
                  {/if}
                </td>
                <td>
                  {rule.notification_type === "recurring" ? "Wiederkehrend" : "Einmalig"}
                  {#if rule.notification_type === "recurring" && rule.interval_value && rule.interval_unit}
                    <div class="rule-preview">Alle {rule.interval_value} {rule.interval_unit === "hours" ? "Std." : rule.interval_unit === "days" ? "Tage" : "Wochen"}</div>
                  {/if}
                </td>
                <td>{targetLabel(rule)}</td>
                <td>{fmtDate(rule.last_sent_at)}</td>
                <td>
                  <span class="status-badge" class:active={!!rule.is_active}>{rule.is_active ? "Aktiv" : "Inaktiv"}</span>
                </td>
                <td>
                  <div class="actions">
                    <button class="btn btn-outline" type="button" on:click={() => void sendNow(rule.id)} disabled={sendingId === rule.id}>
                      {sendingId === rule.id ? "Sende..." : "Jetzt senden"}
                    </button>
                    <button class="btn btn-danger" type="button" on:click={() => void removeRule(rule.id)} disabled={deletingId === rule.id}>
                      {deletingId === rule.id ? "Lösche..." : "Löschen"}
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
  .rule-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .form-row {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    flex: 1;
    min-width: 160px;
  }
  .form-group-narrow {
    flex: 0 0 120px;
    min-width: 100px;
  }
  label {
    font-size: 0.82rem;
    color: var(--text-muted, #aaa);
  }
  .input {
    background: var(--bg-input, #1e1e2e);
    border: 1px solid var(--border, #333);
    border-radius: 6px;
    color: inherit;
    padding: 0.45rem 0.65rem;
    font-size: 0.9rem;
    width: 100%;
    box-sizing: border-box;
  }
  .textarea {
    resize: vertical;
    min-height: 72px;
  }
  .rule-title {
    font-weight: 500;
  }
  .rule-preview {
    font-size: 0.78rem;
    color: var(--text-muted, #aaa);
    margin-top: 2px;
  }
  .status-badge {
    font-size: 0.8rem;
    padding: 2px 8px;
    border-radius: 99px;
    background: var(--bg-muted, #333);
    color: var(--text-muted, #aaa);
  }
  .status-badge.active {
    background: color-mix(in srgb, var(--accent, #4ade80) 20%, transparent);
    color: var(--accent, #4ade80);
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
</style>
