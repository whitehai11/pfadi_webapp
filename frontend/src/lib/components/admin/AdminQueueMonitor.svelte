<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import { apiFetch } from "$lib/api";
  import { pushToast } from "$lib/toast";
  import { adminQueueStore, subscribeAdminChannel } from "$lib/admin/ws/stores";

  type QueueJob = {
    id: string;
    name: string;
    schedule: string;
    last_status: string;
    last_run: string | null;
    next_run: string | null;
    last_error: string | null;
    running: boolean;
  };

  type QueueResponse = {
    activeJobs: number;
    pendingJobs: number;
    failedJobs: number;
    completedJobs: number;
    avgProcessingTime: number;
    retries: number;
    jobs: QueueJob[];
  };

  let data: QueueResponse | null = null;
  let loading = true;
  let selectedError: QueueJob | null = null;
  let unsubscribeChannel: (() => void) | null = null;
  let unsubscribeStore: (() => void) | null = null;

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }) : "-";

  const load = async (toast = false) => {
    try {
      data = await apiFetch<QueueResponse>("/api/admin/queue");
    } catch (error) {
      if (toast) pushToast(error instanceof Error ? error.message : "Queue Monitor nicht erreichbar.", "error");
    } finally {
      loading = false;
    }
  };

  const retry = async (jobId: string) => {
    try {
      await apiFetch(`/api/admin/queue/retry/${jobId}`, { method: "POST" });
      pushToast("Retry gestartet.", "success", 1000);
      await load();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Retry fehlgeschlagen.", "error");
    }
  };

  onMount(() => {
    void load(true);
    unsubscribeChannel = subscribeAdminChannel("queue");
    unsubscribeStore = adminQueueStore.subscribe((payload) => {
      if (!payload) return;
      data = payload as unknown as QueueResponse;
      loading = false;
    });
  });

  onDestroy(() => {
    unsubscribeChannel?.();
    unsubscribeStore?.();
  });
</script>

<section class="section-block">
  <h2 class="section-title">Worker Queue Monitor</h2>
  <div class="grid-3">
    <Card title="Active">{data?.activeJobs ?? 0}</Card>
    <Card title="Pending">{data?.pendingJobs ?? 0}</Card>
    <Card title="Failed">{data?.failedJobs ?? 0}</Card>
    <Card title="Completed">{data?.completedJobs ?? 0}</Card>
    <Card title="Avg Processing">{(data?.avgProcessingTime ?? 0).toFixed(1)} ms</Card>
    <Card title="Retries">{data?.retries ?? 0}</Card>
  </div>

  <Card title="Jobs">
    {#if loading}
      <p class="text-muted">Lade Queue-Daten...</p>
    {:else}
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Job</th>
              <th>Status</th>
              <th>Last Run</th>
              <th>Next Run</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {#each data?.jobs ?? [] as job}
              <tr>
                <td>{job.name}</td>
                <td>{job.last_status}</td>
                <td>{fmt(job.last_run)}</td>
                <td>{fmt(job.next_run)}</td>
                <td>
                  <div class="actions">
                    <button class="btn btn-outline" type="button" on:click={() => retry(job.id)}>Retry</button>
                    {#if job.last_error}
                      <button class="btn btn-outline" type="button" on:click={() => (selectedError = job)}>Details</button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>

  {#if selectedError}
    <button class="modal-backdrop" type="button" aria-label="Schließen" on:click={() => (selectedError = null)}></button>
    <div class="modal">
      <h3>Failed Job Details</h3>
      <p><strong>{selectedError.name}</strong></p>
      <pre>{selectedError.last_error}</pre>
      <button class="btn btn-outline" type="button" on:click={() => (selectedError = null)}>Schließen</button>
    </div>
  {/if}
</section>
