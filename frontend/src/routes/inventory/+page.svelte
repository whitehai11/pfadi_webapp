<script lang="ts">
  import { onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import { apiFetch } from "$lib/api";
  import { session } from "$lib/auth";
  import { getBoxTag, isIOS, isNfcSupported, isStandalone, writeNfcTag } from "$lib/nfc";

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

  let nfcMessage = "";
  let boxMessage: Record<string, string> = {};
  let iosBoxId: string | null = null;
  let activity = { type: "none", message: "Noch keine Änderungen.", time: "" };

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
    try {
      if (!boxContent) return;
      const details = [
        boxCategory ? `Kategorie: ${boxCategory}` : "",
        boxCondition ? `Zustand: ${boxCondition}` : "",
        boxNote ? `Hinweis: ${boxNote}` : ""
      ]
        .filter(Boolean)
        .join("\n");
      await apiFetch("/api/boxes", {
        method: "POST",
        body: JSON.stringify({
          name: boxContent,
          description: details || null
        })
      });
      setActivity("created", `Box angelegt: ${boxContent}`);
      boxContent = "";
      boxCategory = "";
      boxCondition = "";
      boxNote = "";
      await loadBoxes();
    } catch {
      error = "Box konnte nicht angelegt werden.";
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
    <p class="page-kicker">Material</p>
    <h1 class="page-title">Boxen und Kennungen geordnet pflegen.</h1>
    <p class="page-description">Verwalte Lagerboxen in ruhigen Karten und schreibe NFC-Daten direkt aus der App.</p>
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
    <Card title="Neue Box" description="Lege eine neue Materialbox mit kurzen Zusatzinformationen an.">
      <form class="split-grid" on:submit|preventDefault={createBox}>
        <div class="form-grid">
          <div class="field">
            <label for="boxContent">Name oder Inhalt</label>
            <input id="boxContent" class="input" bind:value={boxContent} required />
          </div>
          <div class="field">
            <label for="boxCategory">Kategorie</label>
            <input id="boxCategory" class="input" bind:value={boxCategory} />
          </div>
        </div>

        <div class="form-grid">
          <div class="field">
            <label for="boxCondition">Zustand</label>
            <input id="boxCondition" class="input" bind:value={boxCondition} />
          </div>
          <div class="field">
            <label for="boxNote">Hinweis</label>
            <input id="boxNote" class="input" bind:value={boxNote} />
          </div>
        </div>

        <div class="actions" style="grid-column: 1 / -1;">
          {#if flags.nfc_enabled}
            <span class="badge badge-info">Kennung wird automatisch vergeben</span>
          {/if}
          <button class="btn btn-primary" type="submit">Box anlegen</button>
        </div>
      </form>
    </Card>
  {/if}

  <Card title="Alle Boxen" description="Bestehende Boxen inklusive Kennung und NFC-Aktionen.">
    {#if loading}
      <p class="text-muted">Lade Boxen...</p>
    {:else if error}
      <p class="status-banner error">{error}</p>
    {:else if boxes.length === 0}
      <p class="text-muted">Noch keine Boxen vorhanden.</p>
    {:else}
      <div class="card-grid">
        {#each boxes as box}
          <Card title={box.name} description="Boxdetails und NFC-Verknüpfung." interactive={true}>
            <div slot="actions">
              {#if canEdit($session?.role)}
                <button class="icon-button" type="button" aria-label="Löschen" on:click={() => deleteBox(box.id)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M6 7h12l-1 14H7L6 7zm3-3h6l1 2H8l1-2z" />
                  </svg>
                </button>
              {/if}
            </div>

            <div class="page-stack">
              <div class="actions">
                <span class="badge badge-secondary">{box.nfc_tag}</span>
                {#if flags.nfc_enabled}
                  <button class="btn btn-outline" type="button" on:click={() => writeBoxTag(box)}>NFC schreiben</button>
                {/if}
              </div>

              {#if ios && iosBoxId === box.id}
                <Card title="iPhone Workflow" description="Das Schreiben läuft über NFC Tools auf iOS.">
                  <p class="text-muted">Schreibe diesen Wert: {box.nfc_tag}</p>
                  <p class="text-muted">Web-App-Modus: {standalone ? "Aktiv" : "Inaktiv"}</p>
                  <div class="actions">
                    <button class="btn btn-outline" type="button" on:click={openNfcTools}>NFC Tools öffnen</button>
                    <button class="btn btn-outline" type="button" on:click={openAppStore}>App Store öffnen</button>
                  </div>
                </Card>
              {/if}

              {#if boxMessage[box.id]}
                <p class="status-banner">{boxMessage[box.id]}</p>
              {/if}
            </div>
          </Card>
        {/each}
      </div>
    {/if}
  </Card>

  {#if nfcMessage}
    <p class="status-banner">{nfcMessage}</p>
  {/if}
</div>
