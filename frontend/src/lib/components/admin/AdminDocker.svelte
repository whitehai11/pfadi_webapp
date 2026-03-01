<script lang="ts">
  import { onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import { apiFetch } from "$lib/api";
  import { pushToast } from "$lib/toast";

  type DockerContainer = {
    id: string | null;
    name: string;
    status: string;
    uptimeSeconds: number;
    imageVersion: string;
  };

  type DockerStatus = {
    dockerAvailable: boolean;
    containers: DockerContainer[];
  };

  let status: DockerStatus | null = null;
  let loading = true;
  let restarting = false;

  const uptime = (seconds: number | undefined) => {
    const s = Math.max(0, Math.floor(Number(seconds ?? 0)));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const load = async () => {
    loading = true;
    try {
      status = await apiFetch<DockerStatus>("/api/admin/docker");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Docker-Status konnte nicht geladen werden.", "error");
    } finally {
      loading = false;
    }
  };

  const restart = async () => {
    if (restarting) return;
    restarting = true;
    try {
      await apiFetch("/api/admin/docker/restart", { method: "POST" });
      pushToast("Restart ausgelöst.", "success", 1200);
      await load();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Restart fehlgeschlagen.", "error");
    } finally {
      restarting = false;
    }
  };

  onMount(() => {
    void load();
  });
</script>

<section class="section-block">
  <h2 class="section-title">Docker Status</h2>
  <Card title="Container">
    {#if loading}
      <p class="text-muted">Lade Containerstatus...</p>
    {:else if !status?.dockerAvailable}
      <p class="text-muted">Docker Umgebung nicht erkannt.</p>
    {:else}
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Uptime</th>
              <th>Image Version</th>
              <th>ID</th>
            </tr>
          </thead>
          <tbody>
            {#each status?.containers ?? [] as container}
              <tr>
                <td>{container.name}</td>
                <td>{container.status}</td>
                <td>{uptime(container.uptimeSeconds)}</td>
                <td>{container.imageVersion}</td>
                <td>{container.id ?? "-"}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="actions">
        <button class="btn btn-danger" type="button" disabled={restarting} on:click={restart}>
          {restarting ? "Restart..." : "Restart"}
        </button>
      </div>
    {/if}
  </Card>
</section>
