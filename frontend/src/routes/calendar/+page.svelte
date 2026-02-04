<script lang="ts">
  import { onMount } from "svelte";
  import { apiFetch } from "$lib/api";
  import { session } from "$lib/auth";

  let events: any[] = [];
  let availability: Record<string, any> = {};
  let loading = true;
  let error = "";
  let editingId: string | null = null;
  let webcalUrl = "/calendar.ics";

  let title = "";
  let type = "Gruppenstunde";
  let start_at = "";
  let end_at = "";
  let location = "";
  let description = "";
  let packlist_required = false;

  const loadEvents = async () => {
    loading = true;
    error = "";
    try {
      events = await apiFetch("/api/calendar");
      const availabilityEntries = await Promise.all(
        events.map((event) => apiFetch(`/api/calendar/${event.id}/availability`))
      );
      availability = events.reduce((acc, event, index) => {
        acc[event.id] = availabilityEntries[index];
        return acc;
      }, {} as Record<string, any>);
    } catch {
      error = "Kalender konnte nicht geladen werden.";
    } finally {
      loading = false;
    }
  };

  const resetForm = () => {
    editingId = null;
    title = "";
    type = "Gruppenstunde";
    start_at = "";
    end_at = "";
    location = "";
    description = "";
    packlist_required = false;
  };

  const toLocalInput = (iso: string) => {
    const date = new Date(iso);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  let formRef: HTMLDivElement | null = null;

  const scrollToForm = () => {
    formRef?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const createOrUpdate = async () => {
    try {
      const payload = {
        title,
        type,
        start_at: new Date(start_at).toISOString(),
        end_at: new Date(end_at).toISOString(),
        location,
        description,
        packlist_required
      };

      if (editingId) {
        await apiFetch(`/api/calendar/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch("/api/calendar", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      resetForm();
      await loadEvents();
    } catch {
      error = "Termin konnte nicht gespeichert werden.";
    }
  };

  const editEvent = (event: any) => {
    editingId = event.id;
    title = event.title;
    type = event.type;
    start_at = toLocalInput(event.start_at);
    end_at = toLocalInput(event.end_at);
    location = event.location;
    description = event.description;
    packlist_required = Boolean(event.packlist_required);
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Termin wirklich löschen?")) return;
    await apiFetch(`/api/calendar/${id}`, { method: "DELETE" });
    await loadEvents();
  };

  const setAvailability = async (eventId: string, status: string) => {
    await apiFetch(`/api/calendar/${eventId}/availability`, {
      method: "POST",
      body: JSON.stringify({ status })
    });
    await loadEvents();
  };

  const myAvailability = (eventId: string) => {
    const entries = availability[eventId]?.entries ?? [];
    const me = entries.find((entry: any) => entry.user_id === $session?.id);
    return me?.status ?? null;
  };

  const availabilityLabel = (value: string) => {
    if (value === "yes") return "Kann";
    if (value === "maybe") return "Vielleicht";
    return "Kann nicht";
  };

  const typeBadge = (value: string) => {
    if (value === "Lager") return "badge-warning";
    if (value === "Aktion") return "badge-info";
    if (value === "Sonstiges") return "badge-secondary";
    return "badge-success";
  };

  onMount(() => {
    if (typeof window !== "undefined") {
      webcalUrl = window.location.origin.replace(/^https?/, "webcal") + "/calendar.ics";
    }
    loadEvents();
  });
</script>

<section class="card-grid grid-2">
  <div class="card">
    <h2 class="page-title">Kalender</h2>
    <div class="actions">
      <a class="btn btn-outline" href={webcalUrl}>Kalender abonnieren</a>
    </div>
  </div>
  {#if $session?.role === 'admin'}
    <div class="card" bind:this={formRef}>
      <h3 class="section-title">{editingId ? "Termin bearbeiten" : "Neuer Termin"}</h3>
      <form class="form-grid" on:submit|preventDefault={createOrUpdate}>
        <div class="field">
          <label for="title">Titel</label>
          <input id="title" class="input" bind:value={title} required />
        </div>
        <div class="field">
          <label for="type">Typ</label>
          <select id="type" class="select" bind:value={type}>
            <option>Gruppenstunde</option>
            <option>Lager</option>
            <option>Aktion</option>
            <option>Sonstiges</option>
          </select>
        </div>
        <div class="field">
          <label for="start">Start</label>
          <input id="start" class="input" type="datetime-local" bind:value={start_at} required />
        </div>
        <div class="field">
          <label for="end">Ende</label>
          <input id="end" class="input" type="datetime-local" bind:value={end_at} required />
        </div>
        <div class="field">
          <label for="location">Ort</label>
          <input id="location" class="input" bind:value={location} required />
        </div>
        <div class="field">
          <label for="description">Beschreibung</label>
          <textarea id="description" class="textarea" rows="3" bind:value={description}></textarea>
        </div>
        <label class="toggle">
          <input type="checkbox" bind:checked={packlist_required} />
          Packliste erforderlich
        </label>
        <div class="actions">
          <button class="btn btn-primary" type="submit">Speichern</button>
          {#if editingId}
            <button class="btn btn-outline" type="button" on:click={resetForm}>Abbrechen</button>
          {/if}
        </div>
      </form>
    </div>
  {/if}
</section>

<section class="card-grid">
  {#if loading}
    <div class="card">Lade Termine...</div>
  {:else if error}
    <div class="card">{error}</div>
  {:else if events.length === 0}
    <div class="card empty-state">
      <h3 class="section-title">Noch keine Termine</h3>
      <div class="actions">
        <a class="btn btn-outline" href={webcalUrl}>Kalender abonnieren</a>
        {#if $session?.role === 'admin'}
          <button class="btn btn-primary" type="button" on:click={scrollToForm}>
            Termin anlegen
          </button>
        {/if}
      </div>
    </div>
  {:else}
    {#each events as event}
      <article class="card">
        <div class="actions actions-between">
          <div>
            <h3 class="section-title">{event.title}</h3>
            <p class="text-muted">{new Date(event.start_at).toLocaleString('de-DE')} - {new Date(event.end_at).toLocaleString('de-DE')}</p>
          </div>
          {#if $session?.role === 'admin'}
            <div class="actions">
              <button class="icon-btn" type="button" on:click={() => editEvent(event)} aria-label="Bearbeiten">
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M4 17.25V20h2.75L17.81 8.94l-2.75-2.75L4 17.25zm15.71-9.04a1.003 1.003 0 0 0 0-1.42l-2.5-2.5a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 2.75 2.75 1.99-1.66z"/>
                </svg>
              </button>
              <button class="icon-btn" type="button" on:click={() => deleteEvent(event.id)} aria-label="Löschen">
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M6 7h12l-1 14H7L6 7zm3-3h6l1 2H8l1-2z"/>
                </svg>
              </button>
            </div>
          {/if}
        </div>
        <div class="actions">
          <span class={`badge ${typeBadge(event.type)}`}>{event.type}</span>
          {#if event.packlist_required}
            <span class="badge badge-info">Packliste erforderlich</span>
          {/if}
        </div>
        <p>{event.location}</p>
        <p class="text-muted">{event.description}</p>
        <div class="card-grid grid-2">
          <div class="card">
            <h4 class="section-title">Teilnahme</h4>
            <p class="text-muted">Was kannst du dir vorstellen?</p>
            <div class="actions">
              <button class="btn btn-outline" on:click={() => setAvailability(event.id, "yes")}>
                Kann
              </button>
              <button class="btn btn-outline" on:click={() => setAvailability(event.id, "maybe")}>
                Vielleicht
              </button>
              <button class="btn btn-outline" on:click={() => setAvailability(event.id, "no")}>
                Kann nicht
              </button>
            </div>
            {#if myAvailability(event.id)}
              <p class="text-muted">Dein Status: {availabilityLabel(myAvailability(event.id))}</p>
            {/if}
          </div>
          <div class="card">
            <h4 class="section-title">Rückmeldungen</h4>
            <div class="actions">
              <span class="badge badge-success">Kann: {availability[event.id]?.counts?.yes ?? 0}</span>
              <span class="badge badge-info">Vielleicht: {availability[event.id]?.counts?.maybe ?? 0}</span>
              <span class="badge badge-warning">Kann nicht: {availability[event.id]?.counts?.no ?? 0}</span>
            </div>
            <div class="card-grid">
              {#each availability[event.id]?.entries ?? [] as entry}
                <div class="actions actions-between">
                  <span>{entry.email}</span>
                  <span class={`badge ${entry.status === 'yes' ? 'badge-success' : entry.status === 'maybe' ? 'badge-info' : 'badge-warning'}`}>
                    {availabilityLabel(entry.status)}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </article>
    {/each}
  {/if}
</section>
