<script lang="ts">
  import { onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { apiFetch } from "$lib/api";
  import { setToken, session } from "$lib/auth";

  let username = "";
  let password = "";
  let message = "";

  let loadingDashboard = false;
  let upcomingEvents: any[] = [];
  let lowStockItems: any[] = [];
  let openResponses: { id: string; title: string; start_at: string }[] = [];

  const login = async () => {
    message = "";
    try {
      const result = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      setToken(result.token);
      message = "Login erfolgreich.";
    } catch {
      message = "Login fehlgeschlagen.";
    }
  };

  const register = async () => {
    message = "";
    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      message = "Registrierung abgeschlossen. Bitte einloggen.";
    } catch {
      message = "Registrierung fehlgeschlagen.";
    }
  };

  const loadDashboard = async () => {
    if (!$session) return;

    loadingDashboard = true;
    try {
      const [events, inventory] = await Promise.all([
        apiFetch("/api/calendar"),
        apiFetch("/api/inventory").catch(() => [])
      ]);

      const now = Date.now();
      const futureEvents = events
        .filter((event: any) => new Date(event.end_at).getTime() >= now)
        .sort((a: any, b: any) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

      upcomingEvents = futureEvents.slice(0, 3);
      lowStockItems = inventory
        .filter((item: any) => Number(item.quantity) <= Number(item.min_quantity))
        .slice(0, 3);

      const responseChecks = await Promise.all(
        futureEvents.slice(0, 8).map(async (event: any) => {
          try {
            const availability = await apiFetch(`/api/calendar/${event.id}/availability`);
            const responded = (availability.entries ?? []).some((entry: any) => entry.user_id === $session?.id);
            return responded ? null : event;
          } catch {
            return null;
          }
        })
      );

      openResponses = responseChecks.filter(Boolean);
    } catch {
      upcomingEvents = [];
      lowStockItems = [];
      openResponses = [];
    } finally {
      loadingDashboard = false;
    }
  };

  $: if ($session) {
    loadDashboard();
  }

  onMount(() => {
    if ($session) {
      loadDashboard();
    }
  });
</script>

{#if !$session}
  <section class="auth-screen">
    <div class="auth-card">
      <div class="auth-brand">
        <div class="logo-badge">
          <Icon name="sparkles" size={26} />
        </div>
        <div class="page-intro">
          <p class="page-kicker">Pfadfinder Organisation</p>
          <h1 class="page-title">Ruhig organisiert. Klar im Alltag.</h1>
          <p class="page-description">
            Die Webapp bündelt Termine, Material und Rückmeldungen in einer klaren Oberfläche.
          </p>
        </div>
      </div>

      <form class="auth-form" on:submit|preventDefault={login}>
        <div class="field">
          <label for="username">Benutzername</label>
          <input id="username" class="input" type="text" bind:value={username} placeholder="z. B. max" />
        </div>
        <div class="field">
          <label for="password">Passwort</label>
          <input id="password" class="input" type="password" bind:value={password} placeholder="Mindestens 8 Zeichen" />
        </div>
        <div class="actions">
          <button class="btn btn-primary" type="submit">Einloggen</button>
          <button class="btn btn-outline" type="button" on:click={register}>Registrieren</button>
        </div>
        {#if message}
          <p class="status-banner">{message}</p>
        {/if}
      </form>
    </div>
  </section>
{:else}
  <div class="page-stack">
    <section class="page-intro">
      <p class="page-kicker">Übersicht</p>
      <h1 class="page-title">Alles Wichtige auf einen Blick.</h1>
      <p class="page-description">Der Startbereich bündelt die nächsten Termine, Materialthemen und offene Rückmeldungen.</p>
    </section>

    <section class="dashboard-grid">
      <Card title="Nächste Termine" description="Die nächsten gemeinsamen Einsätze und Treffen." interactive={true}>
        <div slot="actions">
          <span class="count-pill">{upcomingEvents.length}</span>
        </div>

        {#if loadingDashboard}
          <p class="text-muted">Lade Übersicht...</p>
        {:else if upcomingEvents.length === 0}
          <p class="text-muted">Keine anstehenden Termine.</p>
        {:else}
          <div class="hairline-list">
            {#each upcomingEvents as event}
              <div class="list-row">
                <div class="list-meta">
                  <strong>{event.title}</strong>
                  <span class="text-muted">{new Date(event.start_at).toLocaleString("de-DE")}</span>
                </div>
                <a class="subtle-button btn" href="/calendar">Öffnen</a>
              </div>
            {/each}
          </div>
        {/if}
      </Card>

      <Card title="Material Status" description="Artikel unter Mindestmenge werden hier priorisiert." interactive={true}>
        <div slot="actions">
          <span class="count-pill">{lowStockItems.length}</span>
        </div>

        {#if loadingDashboard}
          <p class="text-muted">Material wird geladen...</p>
        {:else if lowStockItems.length === 0}
          <p class="text-muted">Aktuell keine kritischen Bestände.</p>
        {:else}
          <div class="hairline-list">
            {#each lowStockItems as item}
              <div class="list-row">
                <div class="list-meta">
                  <strong>{item.name}</strong>
                  <span class="text-muted">{item.quantity} von {item.min_quantity} verfügbar</span>
                </div>
                <span class="badge badge-warning">Beobachten</span>
              </div>
            {/each}
          </div>
        {/if}
      </Card>

      <Card title="Offene Rückmeldungen" description="Termine, bei denen deine Antwort noch fehlt." interactive={true}>
        <div slot="actions">
          <span class="count-pill">{openResponses.length}</span>
        </div>

        {#if loadingDashboard}
          <p class="text-muted">Rückmeldungen werden geladen...</p>
        {:else if openResponses.length === 0}
          <p class="text-muted">Alles beantwortet.</p>
        {:else}
          <div class="hairline-list">
            {#each openResponses.slice(0, 3) as event}
              <div class="list-row">
                <div class="list-meta">
                  <strong>{event.title}</strong>
                  <span class="text-muted">{new Date(event.start_at).toLocaleDateString("de-DE")}</span>
                </div>
                <span class="badge badge-info">Offen</span>
              </div>
            {/each}
          </div>
        {/if}
      </Card>
    </section>
  </div>
{/if}
