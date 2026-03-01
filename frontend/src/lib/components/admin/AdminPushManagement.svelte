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
    created_at: string;
    last_sent_at: string | null;
  };

  let loading = true;
  let rules: PushRule[] = [];
  let sendingId = "";
  let deletingId = "";

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

  onMount(() => {
    void load();
  });
</script>

<section class="section-block">
  <h2 class="section-title">Push-Verwaltung</h2>
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
                <td>{rule.title || "Ohne Titel"}</td>
                <td>{rule.notification_type}</td>
                <td>{rule.target_type}</td>
                <td>{fmtDate(rule.last_sent_at)}</td>
                <td>{rule.is_active ? "Aktiv" : "Inaktiv"}</td>
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
