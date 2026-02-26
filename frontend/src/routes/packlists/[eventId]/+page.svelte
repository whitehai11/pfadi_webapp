<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import Card from "$lib/components/Card.svelte";
  import SegmentedControl from "$lib/components/SegmentedControl.svelte";
  import { apiFetch } from "$lib/api";
  import { session } from "$lib/auth";

  let packlist: any = null;
  let items: any[] = [];
  let inventory: any[] = [];
  let loading = true;
  let error = "";

  let selectedItem = "";
  let status = "missing";

  const statusOptions = [
    { value: "missing", label: "Fehlt" },
    { value: "prepared", label: "Vorbereitet" },
    { value: "packed", label: "Gepackt" }
  ];

  $: eventId = $page.params.eventId;

  const canEdit = (role: string | undefined) => role === "admin" || role === "materialwart";

  const load = async () => {
    loading = true;
    error = "";
    try {
      packlist = await apiFetch(`/api/packlists/${eventId}`);
      items = packlist.items || [];
      inventory = await apiFetch("/api/inventory");
    } catch {
      error = "Packliste konnte nicht geladen werden.";
    } finally {
      loading = false;
    }
  };

  const createPacklist = async () => {
    try {
      await apiFetch(`/api/packlists/${eventId}`, { method: "POST" });
      await load();
    } catch {
      error = "Packliste konnte nicht erstellt werden.";
    }
  };

  const addItem = async () => {
    if (!selectedItem) return;
    try {
      await apiFetch(`/api/packlists/${packlist.id}/items`, {
        method: "PUT",
        body: JSON.stringify({ items: [{ inventory_item_id: selectedItem, status }] })
      });
      selectedItem = "";
      status = "missing";
      await load();
    } catch {
      error = "Packlisteneintrag konnte nicht hinzugefügt werden.";
    }
  };

  const updateStatus = async (itemId: string, newStatus: string) => {
    await apiFetch(`/api/packlists/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus })
    });
    await load();
  };

  const statusBadge = (value: string) => {
    if (value === "packed") return "badge-success";
    if (value === "prepared") return "badge-info";
    return "badge-warning";
  };

  const progress = () => {
    if (!items.length) return 0;
    const done = items.filter((item) => item.status === "packed").length;
    return Math.round((done / items.length) * 100);
  };

  const missingItems = () => items.filter((item) => item.status !== "packed");

  onMount(load);
</script>

<div class="page-stack">
  <section class="page-intro">
    <p class="page-kicker">Packliste</p>
    <h1 class="page-title">Material für einen Termin gezielt vorbereiten.</h1>
    <p class="page-description">Fortschritt, fehlende Einträge und Statusänderungen liegen in einer kompakten Übersicht.</p>
  </section>

  {#if error}
    <p class="status-banner error">{error}</p>
  {/if}

  {#if loading}
    <Card title="Packliste" description="Die Daten werden geladen.">
      <p class="text-muted">Einen Moment bitte…</p>
    </Card>
  {:else if !packlist}
    <Card title="Keine Packliste vorhanden" description="Für diesen Termin wurde noch keine Packliste angelegt.">
      {#if canEdit($session?.role)}
        <div class="actions">
          <button class="btn btn-primary" type="button" on:click={createPacklist}>Packliste erstellen</button>
        </div>
      {/if}
    </Card>
  {:else}
    <section class="split-grid">
      <Card title="Fortschritt" description="Wie weit die Vorbereitung bereits fortgeschritten ist.">
        <div class="metric">
          <div class="metric__row">
            <span class="metric__value">{progress()}%</span>
            <span class="badge badge-secondary">{items.length} Einträge</span>
          </div>
          <progress class="progress-native" value={progress()} max="100"></progress>
          <p class="text-muted">
            {#if missingItems().length > 0}
              Noch offen: {missingItems().length}
            {:else}
              Alles gepackt.
            {/if}
          </p>
        </div>
      </Card>

      <Card title="Offene Punkte" description="Material, das noch vorbereitet oder gepackt werden muss.">
        {#if missingItems().length === 0}
          <p class="text-muted">Keine offenen Einträge.</p>
        {:else}
          <div class="hairline-list">
            {#each missingItems() as item}
              <div class="list-row">
                <div class="list-meta">
                  <strong>{inventory.find((entry) => entry.id === item.inventory_item_id)?.name ?? item.inventory_item_id}</strong>
                </div>
                <span class={`badge ${statusBadge(item.status)}`}>{item.status}</span>
              </div>
            {/each}
          </div>
        {/if}
      </Card>
    </section>

    <Card title="Packlisteneinträge" description="Jeder Eintrag lässt sich direkt im jeweiligen Status aktualisieren.">
      <div class="card-grid">
        {#each items as item}
          <Card
            title={inventory.find((entry) => entry.id === item.inventory_item_id)?.name ?? item.inventory_item_id}
            description="Status des Materials für diesen Termin."
            interactive={true}
          >
            <div slot="actions">
              <span class={`badge ${statusBadge(item.status)}`}>{item.status}</span>
            </div>

            {#if canEdit($session?.role)}
              <div class="actions">
                <button class="btn btn-outline" type="button" on:click={() => updateStatus(item.id, "missing")}>Fehlt</button>
                <button class="btn btn-outline" type="button" on:click={() => updateStatus(item.id, "prepared")}>Vorbereitet</button>
                <button class="btn btn-primary" type="button" on:click={() => updateStatus(item.id, "packed")}>Gepackt</button>
              </div>
            {/if}
          </Card>
        {/each}
      </div>
    </Card>

    {#if canEdit($session?.role)}
      <Card title="Eintrag hinzufügen" description="Material auswählen und den Ausgangsstatus festlegen.">
        <div class="split-grid">
          <div class="field">
            <label for="inventory">Material</label>
            <select id="inventory" class="select" bind:value={selectedItem}>
              <option value="">Bitte wählen</option>
              {#each inventory as inv}
                <option value={inv.id}>{inv.name} ({inv.location})</option>
              {/each}
            </select>
          </div>

          <div class="field">
            <p class="fieldset-label">Status</p>
            <SegmentedControl bind:value={status} options={statusOptions} ariaLabel="Status für neuen Packlisteneintrag" />
          </div>
        </div>

        <div class="actions">
          <button class="btn btn-primary" type="button" on:click={addItem}>Hinzufügen</button>
        </div>
      </Card>
    {/if}
  {/if}
</div>
