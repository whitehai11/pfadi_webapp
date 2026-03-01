<script lang="ts">
  import { onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import { apiFetch } from "$lib/api";
  import { session } from "$lib/auth";
  import { hasUnsafePattern, sanitizeText } from "$lib/forms";
  import { getBoxTag, isIOS, isNfcSupported, isStandalone, writeNfcTag } from "$lib/nfc";
  import { pushToast } from "$lib/toast";

  let boxes: any[] = [];
  let ios = false;
  let standalone = false;
  let loading = true;
  let error = "";
  let flags = { nfc_enabled: false };

  let boxContent = "";
  let boxCategory = "";
  let boxCondition = "";
  let boxNote = "";
  let boxSubmitting = false;
  let boxErrors: { boxContent?: string; boxCategory?: string; boxCondition?: string; boxNote?: string } = {};

  let nfcMessage = "";
  let boxMessage: Record<string, string> = {};
  let iosBoxId: string | null = null;
  let deletingBoxId = "";
  let writingTagBoxId = "";
  let activity = { type: "none", message: "Keine Änderungen", time: "" };

  const canEdit = (role: string | undefined) => role === "admin" || role === "materialwart";

  const loadBoxes = async () => {
    loading = true;
    error = "";
    try {
      const [settings, boxList] = await Promise.all([apiFetch("/api/settings").catch(() => []), apiFetch("/api/boxes")]);
      boxes = boxList;
      for (const item of settings) {
        if (item.key === "nfc_enabled") flags.nfc_enabled = item.value === "true";
      }
    } catch {
      error = "Boxen konnten nicht geladen werden.";
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

  const createBox = async () => {
    if (boxSubmitting) return;

    boxErrors = {};
    const normalizedContent = sanitizeText(boxContent, 140);
    const normalizedCategory = sanitizeText(boxCategory, 120);
    const normalizedCondition = sanitizeText(boxCondition, 120);
    const normalizedNote = sanitizeText(boxNote, 300);

    if (!normalizedContent) boxErrors.boxContent = "Name erforderlich.";
    else if (hasUnsafePattern(normalizedContent)) boxErrors.boxContent = "Ungultige Zeichenfolge.";

    if (hasUnsafePattern(normalizedCategory)) boxErrors.boxCategory = "Ungultige Zeichenfolge.";
    if (hasUnsafePattern(normalizedCondition)) boxErrors.boxCondition = "Ungultige Zeichenfolge.";
    if (hasUnsafePattern(normalizedNote)) boxErrors.boxNote = "Ungultige Zeichenfolge.";

    if (Object.keys(boxErrors).length > 0) {
      error = "Eingaben prufen.";
      return;
    }

    boxSubmitting = true;
    try {
      const details = [
        normalizedCategory ? `Kategorie: ${normalizedCategory}` : "",
        normalizedCondition ? `Zustand: ${normalizedCondition}` : "",
        normalizedNote ? `Hinweis: ${normalizedNote}` : ""
      ]
        .filter(Boolean)
        .join("\n");
      await apiFetch("/api/boxes", {
        method: "POST",
        body: JSON.stringify({
          name: normalizedContent,
          description: details || null
        })
      });
      setActivity("created", `Box angelegt: ${normalizedContent}`);
      boxContent = "";
      boxCategory = "";
      boxCondition = "";
      boxNote = "";
      pushToast("Box gespeichert.", "success");
      await loadBoxes();
    } catch {
      error = "Box konnte nicht angelegt werden.";
      pushToast(error, "error");
    } finally {
      boxSubmitting = false;
    }
  };

  const deleteBox = async (id: string) => {
    if (!confirm("Box wirklich löschen?")) return;
    await apiFetch(`/api/boxes/${id}`, { method: "DELETE" });
    setActivity("deleted", "Box gelöscht.");
    await loadBoxes();
  };

  const writeBoxTag = async (box: any) => {
    const tag = box.nfc_tag || getBoxTag(box.id);
    if (isIOS()) {
      iosBoxId = box.id;
      boxMessage[box.id] = "Auf iOS erfolgt das Schreiben über die App NFC Tools.";
      return;
    }
    try {
      if (!isNfcSupported()) {
        boxMessage[box.id] = "NFC nicht verfügbar.";
        return;
      }
      await writeNfcTag(tag);
      boxMessage[box.id] = "Gespeichert.";
    } catch {
      boxMessage[box.id] = "Fehlgeschlagen.";
    }
  };

  const deleteBoxAction = async (id: string) => {
    if (deletingBoxId === id) return;
    deletingBoxId = id;
    try {
      await deleteBox(id);
      pushToast("Box geloscht.", "success", 1500);
    } catch (err) {
      error = err instanceof Error ? err.message : "Box konnte nicht geloscht werden.";
      pushToast(error, "error");
      console.error("[inventory] deleteBox failed", { id, err });
    } finally {
      deletingBoxId = "";
    }
  };

  const writeBoxTagAction = async (box: any) => {
    if (writingTagBoxId === box.id) return;
    writingTagBoxId = box.id;
    try {
      await writeBoxTag(box);
      if (boxMessage[box.id] === "Gespeichert.") {
        pushToast("NFC-Kennung gespeichert.", "success", 1200);
      } else if (boxMessage[box.id]) {
        pushToast(boxMessage[box.id], "error");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "NFC-Schreiben fehlgeschlagen.";
      boxMessage[box.id] = message;
      pushToast(message, "error");
      console.error("[inventory] writeBoxTag failed", { boxId: box.id, err });
    } finally {
      writingTagBoxId = "";
    }
  };

  const openNfcTools = () => {
    window.location.href = "nfctools://";
  };

  const openAppStore = () => {
    window.location.href = "https://apps.apple.com/app/id1252962749";
  };

  onMount(() => {
    ios = isIOS();
    standalone = isStandalone();
    loadBoxes();
  });
</script>

<div class="page-stack">
  <section class="page-intro">
    <h1 class="page-title">Material</h1>
  </section>

  <section class="card activity-card">
    <div class={`activity-strip ${activity.type}`}></div>
    <div class="activity-content">
      <span class="badge badge-secondary">Letzte Änderung</span>
      <div class="list-meta">
        <strong>{activity.message}</strong>
        {#if activity.time}
          <span class="text-muted">{activity.time}</span>
        {/if}
      </div>
    </div>
  </section>

  {#if canEdit($session?.role)}
    <section id="new-box-form" class="page-stack">
      <h2 class="section-title">Neue Box</h2>
      <form class="split-grid" on:submit|preventDefault={createBox}>
        <div class="form-grid">
          <div class="field">
            <label for="boxContent">Name oder Inhalt</label>
            <input id="boxContent" class="input" class:input-invalid={Boolean(boxErrors.boxContent)} bind:value={boxContent} required maxlength="140" />
            {#if boxErrors.boxContent}
              <p class="field-error">{boxErrors.boxContent}</p>
            {/if}
          </div>
          <div class="field">
            <label for="boxCategory">Kategorie</label>
            <input id="boxCategory" class="input" class:input-invalid={Boolean(boxErrors.boxCategory)} bind:value={boxCategory} maxlength="120" />
            {#if boxErrors.boxCategory}
              <p class="field-error">{boxErrors.boxCategory}</p>
            {/if}
          </div>
        </div>

        <div class="form-grid">
          <div class="field">
            <label for="boxCondition">Zustand</label>
            <input id="boxCondition" class="input" class:input-invalid={Boolean(boxErrors.boxCondition)} bind:value={boxCondition} maxlength="120" />
            {#if boxErrors.boxCondition}
              <p class="field-error">{boxErrors.boxCondition}</p>
            {/if}
          </div>
          <div class="field">
            <label for="boxNote">Hinweis</label>
            <input id="boxNote" class="input" class:input-invalid={Boolean(boxErrors.boxNote)} bind:value={boxNote} maxlength="300" />
            {#if boxErrors.boxNote}
              <p class="field-error">{boxErrors.boxNote}</p>
            {/if}
          </div>
        </div>

        <div class="actions grid-span-all">
          {#if flags.nfc_enabled}
            <span class="badge badge-info">Kennung wird automatisch vergeben</span>
          {/if}
          <button class="btn btn-primary" type="submit" disabled={boxSubmitting}>
            {#if boxSubmitting}
              <span class="btn-spinner" aria-hidden="true"></span>
            {/if}
            {boxSubmitting ? "Speichern..." : "Box anlegen"}
          </button>
        </div>
      </form>
    </section>
  {/if}

  <section class="page-stack">
    <h2 class="section-title">Alle Boxen</h2>
    {#if loading}
      <p class="text-muted">Laden...</p>
    {:else if error}
      <p class="status-banner error">{error}</p>
    {:else if boxes.length === 0}
      <p class="text-muted">Keine Boxen.</p>
    {:else}
      <div class="card-grid">
        {#each boxes as box}
          <Card title={box.name}>
            <div slot="actions">
              {#if canEdit($session?.role)}
                <button
                  class="icon-button"
                  type="button"
                  aria-label="Löschen"
                  disabled={deletingBoxId === box.id}
                  on:click={() => deleteBoxAction(box.id)}
                >
                  {#if deletingBoxId === box.id}
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
              <div class="actions">
                <span class="badge badge-secondary">{box.nfc_tag}</span>
                {#if flags.nfc_enabled}
                  <button
                    class="btn btn-outline"
                    type="button"
                    disabled={writingTagBoxId === box.id}
                    on:click={() => writeBoxTagAction(box)}
                  >
                    {writingTagBoxId === box.id ? "Schreibe..." : "NFC schreiben"}
                  </button>
                {/if}
              </div>

              {#if ios && iosBoxId === box.id}
                <section class="section-block">
                  <h3 class="section-title">iPhone</h3>
                  <p class="text-muted">{box.nfc_tag}</p>
                  <p class="text-muted">Web-App-Modus: {standalone ? "Aktiv" : "Inaktiv"}</p>
                  <div class="actions">
                    <button class="btn btn-outline" type="button" on:click={openNfcTools}>NFC Tools öffnen</button>
                    <button class="btn btn-outline" type="button" on:click={openAppStore}>App Store öffnen</button>
                  </div>
                </section>
              {/if}

              {#if boxMessage[box.id]}
                <p class="status-banner">{boxMessage[box.id]}</p>
              {/if}
            </div>
          </Card>
        {/each}
      </div>
    {/if}
  </section>

  {#if nfcMessage}
    <p class="status-banner">{nfcMessage}</p>
  {/if}
</div>
