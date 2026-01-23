<script lang="ts">
  import { apiFetch } from "$lib/api";

  let status = "QR-Code scannen oder Tag-ID eingeben.";
  let item: any = null;
  let cameraActive = false;
  let manualId = "";

  let video: HTMLVideoElement | null = null;
  let detector: BarcodeDetector | null = null;
  let stream: MediaStream | null = null;

  const setupDetector = () => {
    // @ts-ignore
    if ("BarcodeDetector" in window) {
      // @ts-ignore
      detector = new BarcodeDetector({ formats: ["qr_code"] });
    }
  };

  const startCamera = async () => {
    setupDetector();
    if (!detector) {
      status = "QR-Scan wird von diesem Gerät nicht unterstützt.";
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (video) {
        video.srcObject = stream;
        await video.play();
        cameraActive = true;
        scanLoop();
      }
    } catch {
      status = "Kamera konnte nicht gestartet werden.";
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((track) => track.stop());
    cameraActive = false;
  };

  const scanLoop = async () => {
    if (!detector || !video || !cameraActive) return;
    try {
      const barcodes = await detector.detect(video);
      if (barcodes.length > 0) {
        const tagId = barcodes[0].rawValue;
        status = `Code erkannt: ${tagId}`;
        item = await apiFetch(`/api/inventory/tag/${encodeURIComponent(tagId)}`);
        stopCamera();
        return;
      }
    } catch {
      status = "QR-Code konnte nicht gelesen werden.";
    }
    requestAnimationFrame(scanLoop);
  };

  const lookupManual = async () => {
    try {
      item = await apiFetch(`/api/inventory/tag/${encodeURIComponent(manualId)}`);
      status = `Tag gefunden: ${manualId}`;
    } catch {
      status = "Tag nicht gefunden.";
    }
  };
</script>

<section class="card">
  <h2 class="page-title">QR-Code</h2>
  <p class="text-muted">Scanne den QR-Code oder gib die Tag-ID ein.</p>
  <div class="actions">
    <button class="btn btn-primary" on:click={startCamera}>Scan starten</button>
    {#if cameraActive}
      <button class="btn btn-outline" on:click={stopCamera}>Stop</button>
    {/if}
    <span class="hint">{status}</span>
  </div>
  <div class="form-grid">
    <div class="field">
      <label for="manual">Tag-ID</label>
      <input id="manual" class="input" bind:value={manualId} placeholder="box-001" />
    </div>
    <button class="btn btn-outline" on:click={lookupManual}>Suchen</button>
  </div>
  <div class="qr-camera">
    <video bind:this={video} muted playsinline></video>
  </div>
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
