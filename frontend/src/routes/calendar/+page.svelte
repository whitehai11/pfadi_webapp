<script lang="ts">
  import { onMount } from "svelte";
  import { apiFetch } from "$lib/api";
  import { session } from "$lib/auth";
  import Card from "$lib/components/Card.svelte";
  import SegmentedControl from "$lib/components/SegmentedControl.svelte";
  import { hasUnsafePattern, sanitizeMultilineText, sanitizeText } from "$lib/forms";
  import { pushToast } from "$lib/toast";

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
  let formSubmitting = false;
  let deletingEventId = "";
  let availabilitySubmittingByEvent: Record<string, boolean> = {};
  let formErrors: {
    title?: string;
    start_at?: string;
    end_at?: string;
    location?: string;
    description?: string;
  } = {};

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
    if (formSubmitting) return;

    error = "";
    formErrors = {};
    const sanitizedTitle = sanitizeText(title, 140);
    const sanitizedLocation = sanitizeText(location, 140);
    const sanitizedDescription = sanitizeMultilineText(description, 4000);

    if (!sanitizedTitle) formErrors.title = "Titel erforderlich.";
    else if (hasUnsafePattern(sanitizedTitle)) formErrors.title = "Ungultige Zeichenfolge.";

    if (!start_at) formErrors.start_at = "Beginn erforderlich.";
    if (!end_at) formErrors.end_at = "Ende erforderlich.";
    if (start_at && Number.isNaN(new Date(start_at).getTime())) formErrors.start_at = "Ungultiges Datum.";
    if (end_at && Number.isNaN(new Date(end_at).getTime())) formErrors.end_at = "Ungultiges Datum.";

    if (start_at && end_at) {
      const startDate = new Date(start_at).getTime();
      const endDate = new Date(end_at).getTime();
      if (!Number.isNaN(startDate) && !Number.isNaN(endDate) && endDate < startDate) {
        formErrors.end_at = "Ende muss nach Beginn liegen.";
      }
    }

    if (!sanitizedLocation) formErrors.location = "Ort erforderlich.";
    else if (hasUnsafePattern(sanitizedLocation)) formErrors.location = "Ungultige Zeichenfolge.";

    if (hasUnsafePattern(sanitizedDescription)) formErrors.description = "Ungultige Zeichenfolge.";

    if (Object.keys(formErrors).length > 0) {
      error = "Eingaben prufen.";
      return;
    }

    title = sanitizedTitle;
    location = sanitizedLocation;
    description = sanitizedDescription;

    formSubmitting = true;
    try {
      const payload = {
        title: sanitizedTitle,
        type,
        start_at: new Date(start_at).toISOString(),
        end_at: new Date(end_at).toISOString(),
        location: sanitizedLocation,
        description: sanitizedDescription,
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
      pushToast("Termin gespeichert.", "success");
    } catch {
      error = "Termin konnte nicht gespeichert werden.";
      pushToast(error, "error");
    } finally {
      formSubmitting = false;
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

  const deleteEventAction = async (id: string) => {
    if (deletingEventId === id) return;
    deletingEventId = id;
    try {
      await deleteEvent(id);
      pushToast("Termin geloscht.", "success", 1500);
    } catch (err) {
      error = err instanceof Error ? err.message : "Termin konnte nicht geloscht werden.";
      pushToast(error, "error");
      console.error("[calendar] deleteEvent failed", { id, err });
    } finally {
      deletingEventId = "";
    }
  };

  const setAvailabilityAction = async (eventId: string, status: string) => {
    if (availabilitySubmittingByEvent[eventId]) return;
    availabilitySubmittingByEvent = { ...availabilitySubmittingByEvent, [eventId]: true };
    try {
      await setAvailability(eventId, status);
      pushToast("Ruckmeldung gespeichert.", "success", 1200);
    } catch (err) {
      error = err instanceof Error ? err.message : "Ruckmeldung konnte nicht gespeichert werden.";
      pushToast(error, "error");
      console.error("[calendar] setAvailability failed", { eventId, status, err });
    } finally {
      availabilitySubmittingByEvent = { ...availabilitySubmittingByEvent, [eventId]: false };
    }
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
    <h1 class="page-title">Kalender</h1>
  </section>

  <Card title="Kalender abonnieren">
    <div slot="actions">
      <a class="btn btn-outline" href={webcalUrl}>ICS abonnieren</a>
    </div>
  </Card>

  {#if $session}
    <div id="new-event-form" bind:this={formRef}>
      <section class="page-stack">
        <h2 class="section-title">{editingId ? "Termin bearbeiten" : "Neuer Termin"}</h2>
        <form class="page-stack" on:submit|preventDefault={createOrUpdate}>
          <section class="section-block">
            <h3 class="section-title">Grunddaten</h3>
            <div class="form-grid">
              <div class="field">
                <label for="title">Titel</label>
                <input id="title" class="input" class:input-invalid={Boolean(formErrors.title)} bind:value={title} required maxlength="140" />
                {#if formErrors.title}
                  <p class="field-error">{formErrors.title}</p>
                {/if}
              </div>

              <div class="field">
                <p class="fieldset-label">Terminart</p>
                <SegmentedControl bind:value={type} options={typeOptions} ariaLabel="Terminart" />
              </div>

              <div class="field">
                <label for="location">Ort</label>
                <input id="location" class="input" class:input-invalid={Boolean(formErrors.location)} bind:value={location} required maxlength="140" />
                {#if formErrors.location}
                  <p class="field-error">{formErrors.location}</p>
                {/if}
              </div>
            </div>
          </section>

          <section class="section-block">
            <h3 class="section-title">Zeitraum</h3>
            <div class="form-grid">
              <div class="field">
                <label for="start">Beginn</label>
                <input id="start" class="input" class:input-invalid={Boolean(formErrors.start_at)} type="datetime-local" bind:value={start_at} required />
                {#if formErrors.start_at}
                  <p class="field-error">{formErrors.start_at}</p>
                {/if}
              </div>

              <div class="field">
                <label for="end">Ende</label>
                <input id="end" class="input" class:input-invalid={Boolean(formErrors.end_at)} type="datetime-local" bind:value={end_at} required />
                {#if formErrors.end_at}
                  <p class="field-error">{formErrors.end_at}</p>
                {/if}
              </div>

              <div class="toggle-row">
                <div class="list-meta">
                  <strong>Packliste einplanen</strong>
                </div>
                <label class="toggle">
                  <input type="checkbox" bind:checked={packlist_required} />
                </label>
              </div>
            </div>
          </section>

          <section class="section-block">
            <h3 class="section-title">Notiz</h3>
            <div class="field">
              <label for="description">Beschreibung</label>
              <textarea
                id="description"
                class="textarea"
                class:input-invalid={Boolean(formErrors.description)}
                rows="4"
                bind:value={description}
                maxlength="4000"
              ></textarea>
              {#if formErrors.description}
                <p class="field-error">{formErrors.description}</p>
              {/if}
            </div>
          </section>

          <div class="actions">
            <button class="btn btn-primary" type="submit" disabled={formSubmitting}>
              {#if formSubmitting}
                <span class="btn-spinner" aria-hidden="true"></span>
              {/if}
              {formSubmitting ? "Speichern..." : "Speichern"}
            </button>
            {#if editingId}
              <button class="btn btn-outline" type="button" on:click={resetForm}>Abbrechen</button>
            {/if}
          </div>
        </form>
      </section>
    </div>
  {/if}

  {#if loading}
    <Card title="Termine">
      <p class="text-muted">Laden...</p>
    </Card>
  {:else if error}
    <Card title="Kalender">
      <p class="status-banner error">{error}</p>
    </Card>
  {:else if events.length === 0}
    <Card title="Keine Termine">
      <div class="actions">
        <a class="btn btn-outline" href={webcalUrl}>ICS abonnieren</a>
        {#if $session}
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
            <button
              class="icon-button"
              type="button"
              aria-label="Löschen"
              disabled={deletingEventId === event.id}
              on:click={() => deleteEventAction(event.id)}
            >
              {#if deletingEventId === event.id}
                <span class="btn-spinner" aria-hidden="true"></span>
              {:else}
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M6 7h12l-1 14H7L6 7zm3-3h6l1 2H8l1-2z" />
                </svg>
              {/if}
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
            <section class="section-block">
              <h3 class="section-title">Teilnahme</h3>
              <div class="actions">
                <button
                  class="btn btn-outline"
                  type="button"
                  disabled={Boolean(availabilitySubmittingByEvent[event.id])}
                  on:click={() => setAvailabilityAction(event.id, "yes")}
                >
                  {availabilitySubmittingByEvent[event.id] ? "Speichern..." : "Kann"}
                </button>
                <button
                  class="btn btn-outline"
                  type="button"
                  disabled={Boolean(availabilitySubmittingByEvent[event.id])}
                  on:click={() => setAvailabilityAction(event.id, "maybe")}
                >
                  {availabilitySubmittingByEvent[event.id] ? "Speichern..." : "Vielleicht"}
                </button>
                <button
                  class="btn btn-outline"
                  type="button"
                  disabled={Boolean(availabilitySubmittingByEvent[event.id])}
                  on:click={() => setAvailabilityAction(event.id, "no")}
                >
                  {availabilitySubmittingByEvent[event.id] ? "Speichern..." : "Kann nicht"}
                </button>
              </div>

              {#if myAvailability(event.id)}
                <p class="text-muted">Dein Status: {availabilityLabel(myAvailability(event.id))}</p>
              {/if}
            </section>

            <section class="section-block">
              <h3 class="section-title">Rückmeldungen</h3>
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
            </section>
          </div>
        </div>
      </Card>
    {/each}
  {/if}
</div>
