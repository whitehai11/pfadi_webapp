<script lang="ts">
  import { onMount } from "svelte";
  import { apiFetch } from "$lib/api";
  import { session } from "$lib/auth";
  import Card from "$lib/components/Card.svelte";
  import SegmentedControl from "$lib/components/SegmentedControl.svelte";

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
  let formRef: HTMLDivElement | null = null;

  const typeOptions = [
    { value: "Gruppenstunde", label: "Gruppe" },
    { value: "Lager", label: "Lager" },
    { value: "Aktion", label: "Aktion" },
    { value: "Sonstiges", label: "Sonstiges" }
  ];

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
    scrollToForm();
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

<div class="page-stack">
  <section class="page-intro">
    <p class="page-kicker">Kalender</p>
    <h1 class="page-title">Termine, Zusagen und Überblick.</h1>
    <p class="page-description">Plane Treffen und halte Rückmeldungen direkt im selben Ablauf zusammen.</p>
  </section>

  <Card title="Kalender abonnieren" description="Abonniere alle Termine direkt im Kalender deiner Wahl.">
    <div slot="actions">
      <a class="btn btn-outline" href={webcalUrl}>ICS abonnieren</a>
    </div>
  </Card>

  {#if $session?.role === "admin"}
    <div bind:this={formRef}>
      <Card
        title={editingId ? "Termin bearbeiten" : "Neuer Termin"}
        description="Die Eingaben sind in kleine Abschnitte gegliedert, damit der Termin schnell gepflegt werden kann."
      >
        <form class="page-stack" on:submit|preventDefault={createOrUpdate}>
          <div class="split-grid">
            <Card title="Grunddaten" description="Titel, Typ und Ort des Termins.">
              <div class="form-grid">
                <div class="field">
                  <label for="title">Titel</label>
                  <input id="title" class="input" bind:value={title} required />
                </div>

                <div class="field">
                  <p class="fieldset-label">Terminart</p>
                  <SegmentedControl bind:value={type} options={typeOptions} ariaLabel="Terminart" />
                </div>

                <div class="field">
                  <label for="location">Ort</label>
                  <input id="location" class="input" bind:value={location} required />
                </div>
              </div>
            </Card>

            <Card title="Zeitraum" description="Start und Ende in lokaler Zeit.">
              <div class="form-grid">
                <div class="field">
                  <label for="start">Beginn</label>
                  <input id="start" class="input" type="datetime-local" bind:value={start_at} required />
                </div>

                <div class="field">
                  <label for="end">Ende</label>
                  <input id="end" class="input" type="datetime-local" bind:value={end_at} required />
                </div>

                <div class="toggle-row">
                  <div class="list-meta">
                    <strong>Packliste einplanen</strong>
                    <span class="text-muted">Für Lager und Aktionen direkt vorbereiten.</span>
                  </div>
                  <label class="toggle">
                    <input type="checkbox" bind:checked={packlist_required} />
                  </label>
                </div>
              </div>
            </Card>
          </div>

          <Card title="Notiz" description="Zusätzliche Hinweise für Leitung und Teilnehmende.">
            <div class="field">
              <label for="description">Beschreibung</label>
              <textarea id="description" class="textarea" rows="4" bind:value={description}></textarea>
            </div>
          </Card>

          <div class="actions">
            <button class="btn btn-primary" type="submit">Speichern</button>
            {#if editingId}
              <button class="btn btn-outline" type="button" on:click={resetForm}>Abbrechen</button>
            {/if}
          </div>
        </form>
      </Card>
    </div>
  {/if}

  {#if loading}
    <Card title="Termine" description="Die Termine werden geladen.">
      <p class="text-muted">Einen Moment bitte…</p>
    </Card>
  {:else if error}
    <Card title="Kalender" description="Beim Laden ist ein Problem aufgetreten.">
      <p class="status-banner error">{error}</p>
    </Card>
  {:else if events.length === 0}
    <Card title="Noch keine Termine" description="Sobald Termine vorhanden sind, erscheinen sie hier in chronologischer Reihenfolge.">
      <div class="actions">
        <a class="btn btn-outline" href={webcalUrl}>ICS abonnieren</a>
        {#if $session?.role === "admin"}
          <button class="btn btn-primary" type="button" on:click={scrollToForm}>Termin anlegen</button>
        {/if}
      </div>
    </Card>
  {:else}
    {#each events as event}
      <Card title={event.title} description={`${new Date(event.start_at).toLocaleString("de-DE")} bis ${new Date(event.end_at).toLocaleString("de-DE")}`} interactive={true}>
        <div slot="actions" class="actions">
          <span class={`badge ${typeBadge(event.type)}`}>{event.type}</span>
          {#if event.packlist_required}
            <span class="badge badge-info">Packliste</span>
          {/if}
          {#if $session?.role === "admin"}
            <button class="icon-button" type="button" aria-label="Bearbeiten" on:click={() => editEvent(event)}>
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M4 17.25V20h2.75L17.81 8.94l-2.75-2.75L4 17.25zm15.71-9.04a1.003 1.003 0 0 0 0-1.42l-2.5-2.5a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 2.75 2.75 1.99-1.66z" />
              </svg>
            </button>
            <button class="icon-button" type="button" aria-label="Löschen" on:click={() => deleteEvent(event.id)}>
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M6 7h12l-1 14H7L6 7zm3-3h6l1 2H8l1-2z" />
              </svg>
            </button>
          {/if}
        </div>

        <div class="page-stack">
          <div class="hairline-list">
            <div class="list-row">
              <div class="list-meta">
                <strong>Ort</strong>
                <span class="text-muted">{event.location}</span>
              </div>
            </div>
            {#if event.description}
              <div class="list-row">
                <div class="list-meta">
                  <strong>Beschreibung</strong>
                  <span class="text-muted preline">{event.description}</span>
                </div>
              </div>
            {/if}
          </div>

          <div class="split-grid">
            <Card title="Teilnahme" description="Teile direkt mit, ob du dabei sein kannst.">
              <div class="actions">
                <button class="btn btn-outline" type="button" on:click={() => setAvailability(event.id, "yes")}>Kann</button>
                <button class="btn btn-outline" type="button" on:click={() => setAvailability(event.id, "maybe")}>Vielleicht</button>
                <button class="btn btn-outline" type="button" on:click={() => setAvailability(event.id, "no")}>Kann nicht</button>
              </div>

              {#if myAvailability(event.id)}
                <p class="text-muted">Dein Status: {availabilityLabel(myAvailability(event.id))}</p>
              {/if}
            </Card>

            <Card title="Rückmeldungen" description="Der aktuelle Stand aller Antworten.">
              <div class="actions">
                <span class="badge badge-success">Kann: {availability[event.id]?.counts?.yes ?? 0}</span>
                <span class="badge badge-info">Vielleicht: {availability[event.id]?.counts?.maybe ?? 0}</span>
                <span class="badge badge-warning">Kann nicht: {availability[event.id]?.counts?.no ?? 0}</span>
              </div>

              <div class="hairline-list">
                {#each availability[event.id]?.entries ?? [] as entry}
                  <div class="list-row">
                    <div class="list-meta">
                      <strong>{entry.email}</strong>
                    </div>
                    <span class={`badge ${entry.status === "yes" ? "badge-success" : entry.status === "maybe" ? "badge-info" : "badge-warning"}`}>
                      {availabilityLabel(entry.status)}
                    </span>
                  </div>
                {/each}
              </div>
            </Card>
          </div>
        </div>
      </Card>
    {/each}
  {/if}
</div>
