<script lang="ts">
  import Card from "$lib/components/Card.svelte";
  import { apiFetch } from "$lib/api";
  import { isNfcSupported, readNfcTag } from "$lib/nfc";

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

<div class="page-stack">
  <section class="page-intro">
    <p class="page-kicker">NFC</p>
    <h1 class="page-title">Kennungen leise und direkt auslesen.</h1>
    <p class="page-description">Halte das Gerät an eine Box und öffne Materialdaten ohne zusätzlichen Kontextwechsel.</p>
  </section>

  <section class="surface-card nfc-hero">
    <div class="nfc-glow"></div>
    <div class="split-grid" style="align-items: center;">
      <div class="page-stack">
        <h2 class="section-title">Scan starten</h2>
        <p class="text-muted">Die App liest die Kennung aus und öffnet sofort die passende Box.</p>
        <div class="actions">
          <button class="btn btn-primary" type="button" on:click={startScan}>
            {scanning ? "Läuft..." : "Kennung lesen"}
          </button>
          <span class="text-muted">{status}</span>
        </div>
      </div>
      <div class="actions" style="justify-content: center;">
        <div class="nfc-orb" aria-hidden="true"></div>
      </div>
    </div>
  </section>

  {#if box}
    <Card title="Gefundene Box" description="Die zugehörige Box inklusive zugewiesener Materialien.">
      <div class="split-grid">
        <div class="mini-card">
          <div class="list-meta">
            <strong>Name</strong>
            <span class="text-muted">{box.name}</span>
          </div>
        </div>
        <div class="mini-card">
          <div class="list-meta">
            <strong>Kennung</strong>
            <span class="text-muted">{box.nfc_tag}</span>
          </div>
        </div>
      </div>

      <div class="page-stack">
        <h3 class="section-title">Material</h3>
        {#if box.materials?.length}
          <div class="hairline-list">
            {#each box.materials as entry}
              <div class="list-row">
                <div class="list-meta">
                  <strong>{entry.name}</strong>
                </div>
                <span class="badge badge-secondary">{entry.assigned_quantity}</span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-muted">Keine Daten vorhanden.</p>
        {/if}
      </div>
    </Card>
  {/if}
</div>
