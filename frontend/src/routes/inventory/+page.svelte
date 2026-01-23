<script lang="ts">
  import { onMount } from "svelte";
  import QRCode from "qrcode";
  import { apiFetch } from "$lib/api";
  import { session } from "$lib/auth";
  import { isNfcSupported, writeNfcTag } from "$lib/nfc";

  let items: any[] = [];
  let loading = true;
  let error = "";
  let flags = { nfc_enabled: false, qr_enabled: false };

  let name = "";
  let category = "";
  let location = "";
  let quantity = 1;
  let minQuantity = 0;
  let condition = "";

  let nfcMessage = "";
  let activity = { type: "none", message: "Noch keine Änderungen.", time: "" };

  let sortKey = "name";
  let sortDir = "asc";

  const qrVisible: Record<string, boolean> = {};
  const qrData: Record<string, string> = {};
  let showEmptyMessage = false;

  const canEdit = (role: string | undefined) => role === "admin" || role === "materialwart";

  const loadItems = async () => {
    loading = true;
    error = "";
    try {
      const [inventory, settings] = await Promise.all([
        apiFetch("/api/inventory"),
        apiFetch("/api/settings").catch(() => [])
      ]);
      items = inventory;
      showEmptyMessage = items.length === 0;
      if (showEmptyMessage) {
        setTimeout(() => (showEmptyMessage = false), 3000);
      }
      for (const item of settings) {
        if (item.key === "nfc_enabled") flags.nfc_enabled = item.value === "true";
        if (item.key === "qr_enabled") flags.qr_enabled = item.value === "true";
      }
    } catch {
      error = "Inventar konnte nicht geladen werden.";
      setTimeout(() => (error = ""), 3000);
    } finally {
      loading = false;
    }
  };

  const setActivity = (type: string, message: string) => {
    activity = {
      type,
      message,
      time: new Date().toLocaleString("de-DE")
    };
  };

  const createItem = async () => {
    try {
      await apiFetch("/api/inventory", {
        method: "POST",
        body: JSON.stringify({
          name,
          category,
          location,
          quantity: Number(quantity),
          min_quantity: Number(minQuantity),
          condition
        })
      });
      setActivity("created", `Item angelegt: ${name}`);
      name = "";
      category = "";
      location = "";
      quantity = 1;
      minQuantity = 0;
      condition = "";
      await loadItems();
    } catch {
      error = "Inventar-Item konnte nicht erstellt werden.";
    }
  };

  const deleteItem = async (id: string) => {
    const item = items.find((row) => row.id === id);
    if (!confirm("Item wirklich löschen?")) return;
    await apiFetch(`/api/inventory/${id}`, { method: "DELETE" });
    setActivity("deleted", `Item gelöscht: ${item?.name ?? id}`);
    await loadItems();
  };

  const writeTagForItem = async (tagId: string | null) => {
    nfcMessage = "";
    if (!tagId) {
      nfcMessage = "Keine Tag-ID verfügbar.";
      setTimeout(() => (nfcMessage = ""), 3000);
      return;
    }
    try {
      if (!isNfcSupported()) {
        nfcMessage = "NFC wird in diesem Gerät nicht unterstützt.";
        setTimeout(() => (nfcMessage = ""), 3000);
        return;
      }
      await writeNfcTag(tagId);
      nfcMessage = `Tag geschrieben: ${tagId}`;
      setTimeout(() => (nfcMessage = ""), 3000);
    } catch {
      nfcMessage = "Tag konnte nicht geschrieben werden.";
      setTimeout(() => (nfcMessage = ""), 3000);
    }
  };

  const toggleQr = async (item: any) => {
    if (!item.tag_id) return;
    if (qrVisible[item.id]) {
      qrVisible[item.id] = false;
      return;
    }
    if (!qrData[item.id]) {
      qrData[item.id] = await QRCode.toDataURL(item.tag_id, { margin: 1, width: 140 });
    }
    qrVisible[item.id] = true;
  };

  const conditionBadge = (value: string) => {
    const normalized = value.toLowerCase();
    if (normalized.includes("gut") || normalized.includes("ok")) return "badge-success";
    if (normalized.includes("defekt")) return "badge-warning";
    return "badge-secondary";
  };

  const compare = (a: any, b: any) => {
    const dir = sortDir === "asc" ? 1 : -1;
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv), "de") * dir;
  };

  $: sortedItems = [...items].sort(compare);

  onMount(loadItems);
</script>

<section class="card activity-card">
  <div class={`activity-strip ${activity.type}`}></div>
  <div class="activity-content">
    <span class="badge badge-secondary">Letzte Änderung</span>
    <div>
      <strong>{activity.message}</strong>
      {#if activity.time}
        <p class="hint">{activity.time}</p>
      {/if}
    </div>
  </div>
</section>

<section class="card-grid grid-2">
  {#if canEdit($session?.role)}
    <div class="card">
      <h3 class="section-title">Neues Item</h3>
      <form class="form-grid" on:submit|preventDefault={createItem}>
        <div class="field">
          <label for="name">Name</label>
          <input id="name" class="input" bind:value={name} required />
        </div>
        <div class="field">
          <label for="category">Kategorie</label>
          <input id="category" class="input" bind:value={category} required />
        </div>
        <div class="field">
          <label for="location">Lagerort</label>
          <input id="location" class="input" bind:value={location} required />
        </div>
        <div class="field">
          <label for="quantity">Menge</label>
          <input id="quantity" class="input" type="number" min="0" bind:value={quantity} />
        </div>
        <div class="field">
          <label for="minQuantity">Mindestmenge</label>
          <input id="minQuantity" class="input" type="number" min="0" bind:value={minQuantity} />
        </div>
        <div class="field">
          <label for="condition">Zustand</label>
          <input id="condition" class="input" bind:value={condition} required />
        </div>
        {#if flags.nfc_enabled || flags.qr_enabled}
          <p class="hint">Tag-ID wird automatisch vergeben (z. B. box-001).</p>
        {/if}
        <button class="btn btn-primary" type="submit">Item anlegen</button>
      </form>
    </div>
  {/if}

  <div class="card">
    <h3 class="section-title">Sortierung</h3>
    <div class="form-grid">
      <div class="field">
        <label for="sortKey">Sortieren nach</label>
        <select id="sortKey" class="select" bind:value={sortKey}>
          <option value="name">Name</option>
          <option value="category">Kategorie</option>
          <option value="location">Lagerort</option>
          <option value="quantity">Menge</option>
          <option value="min_quantity">Mindestmenge</option>
          <option value="condition">Zustand</option>
          <option value="tag_id">Tag</option>
        </select>
      </div>
      <div class="field">
        <label for="sortDir">Richtung</label>
        <select id="sortDir" class="select" bind:value={sortDir}>
          <option value="asc">Aufsteigend</option>
          <option value="desc">Absteigend</option>
        </select>
      </div>
    </div>
  </div>
</section>

<section class="card">
  {#if loading}
    <p>Lade Inventar...</p>
  {:else if error}
    <p>{error}</p>
  {:else if sortedItems.length === 0 && showEmptyMessage}
    <p>Kein Inventar vorhanden.</p>
  {:else}
    <div class="table-wrap">
      <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Kategorie</th>
          <th>Lagerort</th>
          <th>Menge</th>
          <th>Mindestmenge</th>
          <th>Zustand</th>
          {#if flags.nfc_enabled || flags.qr_enabled}
            <th>Tag</th>
          {/if}
          {#if canEdit($session?.role)}
            <th>Aktion</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#each sortedItems as item}
          <tr>
            <td>{item.name}</td>
            <td><span class="badge badge-secondary">{item.category}</span></td>
            <td>{item.location}</td>
            <td>{item.quantity}</td>
            <td>{item.min_quantity}</td>
            <td>
              <div class="cell-stack">
                <span class={`badge ${conditionBadge(item.condition)}`}>{item.condition}</span>
                <div class="cell-actions">
                  {#if flags.nfc_enabled}
                    <button class="btn btn-outline" type="button" on:click={() => writeTagForItem(item.tag_id)}>
                      NFC schreiben
                    </button>
                  {/if}
                  {#if flags.qr_enabled}
                    <button class="btn btn-outline" type="button" on:click={() => toggleQr(item)}>
                      QR-Code
                    </button>
                  {/if}
                </div>
              </div>
            </td>
            {#if flags.nfc_enabled || flags.qr_enabled}
              <td>{item.tag_id ?? "-"}</td>
            {/if}
            {#if canEdit($session?.role)}
              <td>
                <button class="icon-btn" type="button" on:click={() => deleteItem(item.id)} aria-label="Löschen">
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M6 7h12l-1 14H7L6 7zm3-3h6l1 2H8l1-2z"/>
                  </svg>
                </button>
              </td>
            {/if}
          </tr>
          {#if flags.qr_enabled && qrVisible[item.id]}
            <tr class="qr-row">
              <td
                colspan={canEdit($session?.role)
                  ? (flags.nfc_enabled || flags.qr_enabled ? 8 : 7)
                  : (flags.nfc_enabled || flags.qr_enabled ? 7 : 6)}
              >
                <div class="qr-box">
                  <img src={qrData[item.id]} alt={`QR-Code ${item.tag_id}`} />
                  <span class="hint">{item.tag_id}</span>
                </div>
              </td>
            </tr>
          {/if}
        {/each}
      </tbody>
      </table>
    </div>
  {/if}
</section>

{#if nfcMessage}
  <section class="card">
    <p class="hint">{nfcMessage}</p>
  </section>
{/if}
