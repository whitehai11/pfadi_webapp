<script lang="ts">
  import { onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
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

<div class="page-stack">
  <section class="page-intro">
    <p class="page-kicker">Packlisten</p>
    <h1 class="page-title">Vorbereitungen pro Termin bündeln.</h1>
    <p class="page-description">Jeder Termin erhält eine eigene Übersicht für Material, Fortschritt und offene Punkte.</p>
  </section>

  <Card title="Termine mit Packlisten" description="Wähle einen Termin, um die Packliste zu öffnen oder zu vervollständigen.">
    {#if loading}
      <p class="text-muted">Lade Termine...</p>
    {:else if error}
      <p class="status-banner error">{error}</p>
    {:else if events.length === 0}
      <p class="text-muted">Keine Termine vorhanden.</p>
    {:else}
      <div class="card-grid">
        {#each events as event}
          <Card title={event.title} description={new Date(event.start_at).toLocaleString("de-DE")} interactive={true}>
            <div slot="actions">
              {#if event.packlist_required}
                <span class="badge badge-warning">Erforderlich</span>
              {:else}
                <span class="badge badge-secondary">Optional</span>
              {/if}
            </div>

            <div class="actions">
              <a class="btn btn-outline" href={`/packlists/${event.id}`}>Packliste öffnen</a>
            </div>
          </Card>
        {/each}
      </div>
    {/if}
  </Card>
</div>
