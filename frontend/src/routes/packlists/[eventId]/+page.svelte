<script lang="ts">
  import { onMount } from "svelte";
  import { apiFetch } from "$lib/api";
  import { session } from "$lib/auth";
  import { page } from "$app/stores";

  let packlist: any = null;
  let items: any[] = [];
  let inventory: any[] = [];
  let loading = true;
  let error = "";

  let selectedItem = "";
  let status = "missing";

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

<section class="card">
  <h2 class="page-title">Packliste</h2>
  {#if error}
    <p class="text-muted">{error}</p>
  {/if}
</section>

{#if loading}
  <div class="card">Lade Packliste...</div>
{:else}
  {#if !packlist}
    <div class="card">
      <p>Keine Packliste vorhanden.</p>
      {#if canEdit($session?.role)}
        <button class="btn btn-primary" on:click={createPacklist}>Packliste erstellen</button>
      {/if}
    </div>
  {:else}
    <section class="card-grid grid-2">
      <div class="card">
        <div class="actions actions-between">
          <h3 class="section-title">Fortschritt</h3>
          <span class="badge badge-secondary">{progress()}%</span>
        </div>
        <progress class="progress-native" value={progress()} max="100"></progress>
        <p class="text-muted">{items.length} Packlisteneinträge insgesamt</p>
        {#if missingItems().length > 0}
          <p class="text-muted">Noch offen: {missingItems().length}</p>
        {:else}
          <p class="text-muted">Alles gepackt.</p>
        {/if}
      </div>
      <div class="card">
        <h3 class="section-title">Was fehlt noch?</h3>
        {#if missingItems().length === 0}
          <p class="text-muted">Keine offenen Packlisteneinträge.</p>
        {:else}
          <ul>
            {#each missingItems() as item}
              <li>{inventory.find((i) => i.id === item.inventory_item_id)?.name ?? item.inventory_item_id}</li>
            {/each}
          </ul>
        {/if}
      </div>
    </section>

    <section class="card">
      <h3 class="section-title">Packlisteneinträge</h3>
      <div class="card-grid">
        {#each items as item}
          <article class="card">
            <div class="actions actions-between">
              <strong>
                {inventory.find((i) => i.id === item.inventory_item_id)?.name ?? item.inventory_item_id}
              </strong>
              <span class={`badge ${statusBadge(item.status)}`}>
                {#if item.status === 'packed'}
                  <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M9 16.2l-3.5-3.5 1.4-1.4L9 13.4l8.7-8.7 1.4 1.4z"/>
                  </svg>
                {:else if item.status === 'prepared'}
                  <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0-6a10 10 0 1 1 0 20 10 10 0 0 1 0-20z"/>
                  </svg>
                {:else}
                  <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M12 2l9 18H3L12 2zm0 7v4h-1.5V9H12zm0 6v2h-1.5v-2H12z"/>
                  </svg>
                {/if}
                {item.status}
              </span>
            </div>
            {#if canEdit($session?.role)}
              <div class="actions">
                <button class="btn btn-outline" on:click={() => updateStatus(item.id, 'missing')}>Fehlt</button>
                <button class="btn btn-outline" on:click={() => updateStatus(item.id, 'prepared')}>Vorbereitet</button>
                <button class="btn btn-primary" on:click={() => updateStatus(item.id, 'packed')}>Gepackt</button>
              </div>
            {/if}
          </article>
        {/each}
      </div>
    </section>

    {#if canEdit($session?.role)}
      <section class="card">
        <h3 class="section-title">Packlisteneintrag hinzufügen</h3>
        <div class="form-grid">
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
            <label for="status">Status</label>
            <select id="status" class="select" bind:value={status}>
              <option value="missing">Fehlt</option>
              <option value="prepared">Vorbereitet</option>
              <option value="packed">Gepackt</option>
            </select>
          </div>
          <button class="btn btn-primary" on:click={addItem}>Hinzufügen</button>
        </div>
      </section>
    {/if}
  {/if}
{/if}
