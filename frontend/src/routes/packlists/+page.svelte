<script lang="ts">
  import { onMount } from "svelte";
  import { apiFetch } from "$lib/api";

  let events: any[] = [];
  let loading = true;
  let error = "";

  const load = async () => {
    loading = true;
    error = "";
    try {
      events = await apiFetch("/api/calendar");
    } catch {
      error = "Termine konnten nicht geladen werden.";
    } finally {
      loading = false;
    }
  };

  onMount(load);
</script>

<section class="card">
  <h2 class="page-title">Packlisten</h2>
  <p class="text-muted">Packlisten sind pro Termin verfügbar. Pflicht bei Lagern.</p>
</section>

<section class="card-grid">
  {#if loading}
    <div class="card">Lade Termine...</div>
  {:else if error}
    <div class="card">{error}</div>
  {:else if events.length === 0}
    <div class="card">Keine Termine vorhanden.</div>
  {:else}
    {#each events as event}
      <article class="card">
        <h3 class="section-title">{event.title}</h3>
        <p class="text-muted">{new Date(event.start_at).toLocaleString('de-DE')}</p>
        <div class="actions">
          {#if event.packlist_required}
            <span class="badge badge-warning">Packliste erforderlich</span>
          {:else}
            <span class="badge badge-secondary">Optional</span>
          {/if}
        </div>
        <a class="btn btn-outline" href={`/packlists/${event.id}`}>Packliste öffnen</a>
      </article>
    {/each}
  {/if}
</section>
