<script lang="ts">
  import { isNfcSupported, readNfcTag } from "$lib/nfc";
  import { apiFetch } from "$lib/api";

  let status = "NFC-Kennung lesen.";
  let box: any = null;
  let scanning = false;

  const startScan = async () => {
    status = "Scanne...";
    box = null;
    try {
      if (!isNfcSupported()) {
        status = "NFC nicht verfügbar.";
        return;
      }
      scanning = true;
      const tagId = await readNfcTag();
      status = `Kennung erkannt: ${tagId}`;
      box = await apiFetch(`/api/boxes/tag/${encodeURIComponent(tagId)}`);
    } catch {
      status = "Kennung konnte nicht gelesen oder nicht gefunden werden.";
    } finally {
      scanning = false;
    }
  };
</script>

<section class="card nfc-hero">
  <div class="nfc-glow"></div>
  <div>
    <h2 class="page-title">NFC</h2>
    <p class="text-muted">Kennung lesen und Box anzeigen.</p>
    <div class="actions">
      <button class="btn btn-primary" on:click={startScan}>Kennung lesen</button>
      <span class="hint">{status}</span>
    </div>
  </div>
  <div class="nfc-orb" aria-hidden="true"></div>
</section>

{#if box}
  <section class="card">
    <h3 class="section-title">Box</h3>
    <div class="card-grid grid-2">
      <div>
        <p><strong>Name:</strong> {box.name}</p>
        <p><strong>Beschreibung:</strong> {box.description || "-"}</p>
      </div>
      <div>
        <p><strong>Kennung:</strong> {box.nfc_tag}</p>
      </div>
    </div>
    <h4 class="section-title">Material</h4>
    {#if box.materials?.length}
      <div class="card-grid">
        {#each box.materials as entry}
          <div class="actions actions-between">
            <span>{entry.name}</span>
            <span class="badge badge-secondary">{entry.assigned_quantity}</span>
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-muted">Keine Daten vorhanden.</p>
    {/if}
  </section>
{/if}
