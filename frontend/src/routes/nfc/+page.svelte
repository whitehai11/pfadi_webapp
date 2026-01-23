<script lang="ts">
  import { isNfcSupported, readNfcTag } from "$lib/nfc";
  import { apiFetch } from "$lib/api";

  let status = "Tippe auf einen NFC-Tag, um den Inhalt zu lesen.";
  let item: any = null;
  let scanning = false;

  const startScan = async () => {
    status = "Scanne...";
    item = null;
    try {
      if (!isNfcSupported()) {
        status = "NFC wird auf diesem Gerät nicht unterstützt.";
        return;
      }
      scanning = true;
      const tagId = await readNfcTag();
      status = `Tag erkannt: ${tagId}`;
      item = await apiFetch(`/api/inventory/tag/${encodeURIComponent(tagId)}`);
    } catch {
      status = "Tag konnte nicht gelesen oder nicht gefunden werden.";
    } finally {
      scanning = false;
    }
  };
</script>

<section class="card nfc-hero">
  <div class="nfc-glow"></div>
  <div>
    <h2 class="page-title">NFC</h2>
    <p class="text-muted">Halte den Tag an dein Gerät. Das System zeigt den Inhalt der Box an.</p>
    <div class="actions">
      <button class="btn btn-primary" on:click={startScan}>Tag lesen</button>
      <span class="hint">{status}</span>
    </div>
  </div>
  <div class="nfc-orb" aria-hidden="true"></div>
</section>

{#if item}
  <section class="card">
    <h3 class="section-title">Gefundene Box</h3>
    <div class="card-grid grid-2">
      <div>
        <p><strong>Name:</strong> {item.name}</p>
        <p><strong>Kategorie:</strong> {item.category}</p>
        <p><strong>Lagerort:</strong> {item.location}</p>
      </div>
      <div>
        <p><strong>Menge:</strong> {item.quantity}</p>
        <p><strong>Zustand:</strong> {item.condition}</p>
        <p><strong>Tag:</strong> {item.tag_id}</p>
      </div>
    </div>
  </section>
{/if}
