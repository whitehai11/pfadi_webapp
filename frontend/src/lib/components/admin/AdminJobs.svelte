<script lang="ts">
  import { onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import { apiFetch } from "$lib/api";
  import { pushToast } from "$lib/toast";

  type JobItem = {
    id: string;
    name: string;
    schedule: string;
    next_run: string | null;
    last_run: string | null;
    last_status: "idle" | "running" | "success" | "failed";
    last_duration_ms: number | null;
    last_error: string | null;
    running: boolean;
  };

  let jobs: JobItem[] = [];
  let loading = true;
  let busy: Record<string, boolean> = {};

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }) : "-";

  const load = async () => {
    loading = true;
    try {
      const response = await apiFetch<{ jobs: JobItem[] }>("/api/admin/jobs");
      jobs = response.jobs ?? [];
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Jobs konnten nicht geladen werden.", "error");
    } finally {
      loading = false;
    }
  };

  const trigger = async (id: string) => {
    if (busy[id]) return;
    busy = { ...busy, [id]: true };
    try {
      await apiFetch(`/api/admin/jobs/run/${id}`, { method: "POST" });
      pushToast("Job gestartet.", "success", 1000);
      await load();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Job konnte nicht gestartet werden.", "error");
    } finally {
      busy = { ...busy, [id]: false };
    }
  };

  onMount(() => {
    void load();
  });
</script>

<section class="section-block">
  <h2 class="section-title">Background Job Dashboard</h2>
  <Card title="Cron Jobs">
    {#if loading}
      <p class="text-muted">Lade Jobs...</p>
    {:else}
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Job</th>
              <th>Status</th>
              <th>Letzter Lauf</th>
              <th>Nächster Lauf</th>
              <th>Dauer</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {#each jobs as job}
              <tr>
                <td>
                  <strong>{job.name}</strong>
                  <div class="text-muted">{job.schedule}</div>
                </td>
                <td>{job.last_status}</td>
                <td>{fmt(job.last_run)}</td>
                <td>{fmt(job.next_run)}</td>
                <td>{job.last_duration_ms ?? 0} ms</td>
                <td>
                  <button class="btn btn-outline" type="button" disabled={job.running || busy[job.id]} on:click={() => trigger(job.id)}>
                    {job.running ? "Läuft..." : "Manuell starten"}
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>
</section>
