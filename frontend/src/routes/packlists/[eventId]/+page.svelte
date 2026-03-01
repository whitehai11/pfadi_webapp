<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import Card from "$lib/components/Card.svelte";
  import SegmentedControl from "$lib/components/SegmentedControl.svelte";
  import { apiFetch } from "$lib/api";
  import { session } from "$lib/auth";
  import { pushToast } from "$lib/toast";

  let packlist: any = null;
  let items: any[] = [];
  let inventory: any[] = [];
  let loading = true;
  let error = "";

  let selectedItem = "";
  let status = "missing";
  let createPacklistSubmitting = false;
  let addItemSubmitting = false;
  let updateStatusSubmittingId = "";
  let addItemError = "";

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
    if (createPacklistSubmitting) return;
    createPacklistSubmitting = true;
    try {
      await apiFetch(`/api/packlists/${eventId}`, { method: "POST" });
      pushToast("Packliste erstellt.", "success");
      await load();
    } catch {
      error = "Packliste konnte nicht erstellt werden.";
      pushToast(error, "error");
    } finally {
      createPacklistSubmitting = false;
    }
  };

  const addItem = async () => {
    if (addItemSubmitting) return;
    addItemError = "";
    if (!selectedItem) {
      addItemError = "Material erforderlich.";
      return;
    }

    addItemSubmitting = true;
    try {
      await apiFetch(`/api/packlists/${packlist.id}/items`, {
        method: "PUT",
        body: JSON.stringify({ items: [{ inventory_item_id: selectedItem, status }] })
      });
      selectedItem = "";
      status = "missing";
      pushToast("Eintrag hinzugefugt.", "success");
      await load();
    } catch {
      error = "Packlisteneintrag konnte nicht hinzugefügt werden.";
      pushToast(error, "error");
    } finally {
      addItemSubmitting = false;
    }
  };

  const updateStatus = async (itemId: string, newStatus: string) => {
    try {
      await apiFetch(`/api/packlists/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus })
      });
      pushToast("Status aktualisiert.", "success", 1500);
      await load();
    } catch {
      error = "Status konnte nicht aktualisiert werden.";
      pushToast(error, "error");
      console.error("[packlists] updateStatus failed", { itemId, newStatus });
    }
  };

  const updateStatusAction = async (itemId: string, newStatus: string) => {
    if (updateStatusSubmittingId === itemId) return;
    updateStatusSubmittingId = itemId;
    try {
      await updateStatus(itemId, newStatus);
    } catch (err) {
      console.error("[packlists] updateStatus failed", { itemId, newStatus, err });
    } finally {
      updateStatusSubmittingId = "";
    }
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
    <h1 class="page-title">Packliste</h1>
  </section>

  {#if error}
    <p class="status-banner error">{error}</p>
  {/if}

  {#if loading}
    <Card title="Packliste">
      <p class="text-muted">Laden...</p>
    </Card>
  {:else if !packlist}
    <Card title="Keine Packliste">
      {#if canEdit($session?.role)}
        <div class="actions">
          <button class="btn btn-primary" type="button" on:click={createPacklist} disabled={createPacklistSubmitting}>
            {#if createPacklistSubmitting}
              <span class="btn-spinner" aria-hidden="true"></span>
            {/if}
            {createPacklistSubmitting ? "Erstellen..." : "Packliste erstellen"}
          </button>
        </div>
      {/if}
    </Card>
  {:else}
    <section class="split-grid">
      <Card title="Fortschritt">
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

      <Card title="Offene Punkte">
        {#if missingItems().length === 0}
          <p class="text-muted">Keine offenen Punkte.</p>
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

    <Card title="Packlisteneinträge">
      {#if items.length === 0}
        <p class="text-muted">Keine Einträge.</p>
      {:else}
        <div class="hairline-list">
          {#each items as item}
            <div class="list-row">
              <div class="list-meta">
                <strong>{inventory.find((entry) => entry.id === item.inventory_item_id)?.name ?? item.inventory_item_id}</strong>
                <span class={`badge ${statusBadge(item.status)}`}>{item.status}</span>
              </div>

              {#if canEdit($session?.role)}
                <div class="actions">
                  <button
                    class="btn btn-outline"
                    type="button"
                    disabled={updateStatusSubmittingId === item.id}
                    on:click={() => updateStatusAction(item.id, "missing")}
                  >
                    {updateStatusSubmittingId === item.id ? "Speichern..." : "Fehlt"}
                  </button>
                  <button
                    class="btn btn-outline"
                    type="button"
                    disabled={updateStatusSubmittingId === item.id}
                    on:click={() => updateStatusAction(item.id, "prepared")}
                  >
                    {updateStatusSubmittingId === item.id ? "Speichern..." : "Vorbereitet"}
                  </button>
                  <button
                    class="btn btn-primary"
                    type="button"
                    disabled={updateStatusSubmittingId === item.id}
                    on:click={() => updateStatusAction(item.id, "packed")}
                  >
                    {updateStatusSubmittingId === item.id ? "Speichern..." : "Gepackt"}
                  </button>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </Card>

    {#if canEdit($session?.role)}
      <section class="page-stack">
        <h2 class="section-title">Eintrag hinzufügen</h2>
        <div class="split-grid">
          <div class="field">
            <label for="inventory">Material</label>
            <select id="inventory" class="select" class:input-invalid={Boolean(addItemError)} bind:value={selectedItem}>
              <option value="">Bitte wählen</option>
              {#each inventory as inv}
                <option value={inv.id}>{inv.name} ({inv.location})</option>
              {/each}
            </select>
            {#if addItemError}
              <p class="field-error">{addItemError}</p>
            {/if}
          </div>

          <div class="field">
            <p class="fieldset-label">Status</p>
            <SegmentedControl bind:value={status} options={statusOptions} ariaLabel="Status für neuen Packlisteneintrag" />
          </div>
        </div>

        <div class="actions">
          <button class="btn btn-primary" type="button" on:click={addItem} disabled={addItemSubmitting}>
            {#if addItemSubmitting}
              <span class="btn-spinner" aria-hidden="true"></span>
            {/if}
            {addItemSubmitting ? "Hinzufugen..." : "Hinzufügen"}
          </button>
        </div>
      </section>
    {/if}
  {/if}
</div>
