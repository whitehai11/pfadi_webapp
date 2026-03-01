<script lang="ts">
  import { onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import HeroButton from "$lib/components/heroui/HeroButton.svelte";
  import Logo from "$lib/components/Logo.svelte";
  import { apiFetch } from "$lib/api";
  import { refreshAppSettings } from "$lib/app-settings";
  import { setSessionProfile, setToken, session } from "$lib/auth";
  import { hasUnsafePattern, sanitizeText } from "$lib/forms";
  import { pushToast } from "$lib/toast";

  let username = "";
  let password = "";
  let message = "";
  let fieldErrors: { username?: string; password?: string } = {};
  let authMode: "login" | "request" | "requested" = "login";
  let authLoading = false;

  let loadingDashboard = false;
  let dashboardError = "";
  let upcomingEvents: any[] = [];
  let lowStockItems: any[] = [];
  let openResponses: { id: string; title: string; start_at: string }[] = [];

  const login = async () => {
    if (authLoading) return;
    message = "";
    fieldErrors = {};

    const normalizedUsername = sanitizeText(username, 120).toLowerCase();
    const normalizedPassword = sanitizeText(password, 200);

    if (!normalizedUsername) fieldErrors.username = "Benutzername erforderlich.";
    else if (normalizedUsername.length < 3) fieldErrors.username = "Mindestens 3 Zeichen.";
    else if (hasUnsafePattern(normalizedUsername)) fieldErrors.username = "Ungultige Zeichenfolge.";

    if (!normalizedPassword) fieldErrors.password = "Passwort erforderlich.";
    else if (normalizedPassword.length < 8) fieldErrors.password = "Mindestens 8 Zeichen.";
    else if (hasUnsafePattern(normalizedPassword)) fieldErrors.password = "Ungultige Zeichenfolge.";

    if (fieldErrors.username || fieldErrors.password) {
      message = "Eingaben prufen.";
      return;
    }

    username = normalizedUsername;
    password = normalizedPassword;
    authLoading = true;
    try {
      const result = await apiFetch<{ token: string; user?: { username?: string; role?: "admin" | "dev" | "user" | "materialwart"; avatar_url?: string | null } }>(
        "/api/auth/login",
        {
        method: "POST",
        body: JSON.stringify({ username: normalizedUsername, password: normalizedPassword }),
        toastOnError: false
      }
      );
      setToken(result.token);
      if (result.user) {
        setSessionProfile({
          username: result.user.username,
          role: result.user.role,
          avatarUrl: result.user.avatar_url ?? null
        });
      }
      await refreshAppSettings();
      pushToast("Erfolgreich eingeloggt.", "success");
    } catch (err) {
      message = err instanceof Error ? err.message : "Login fehlgeschlagen.";
      pushToast(message, "error");
    } finally {
      authLoading = false;
    }
  };

  const requestAccount = async () => {
    if (authLoading) return;
    message = "";
    fieldErrors = {};

    const normalizedUsername = sanitizeText(username, 120).toLowerCase();
    const normalizedPassword = sanitizeText(password, 200);

    if (!normalizedUsername) fieldErrors.username = "Benutzername erforderlich.";
    else if (normalizedUsername.length < 3) fieldErrors.username = "Mindestens 3 Zeichen.";
    else if (hasUnsafePattern(normalizedUsername)) fieldErrors.username = "Ungultige Zeichenfolge.";

    if (!normalizedPassword) fieldErrors.password = "Passwort erforderlich.";
    else if (normalizedPassword.length < 8) fieldErrors.password = "Mindestens 8 Zeichen.";
    else if (hasUnsafePattern(normalizedPassword)) fieldErrors.password = "Ungultige Zeichenfolge.";

    if (fieldErrors.username || fieldErrors.password) {
      message = "Eingaben prufen.";
      return;
    }

    username = normalizedUsername;
    password = normalizedPassword;
    authLoading = true;
    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ username: normalizedUsername, password: normalizedPassword }),
        toastOnError: false
      });
      authMode = "requested";
      password = "";
      pushToast("Account-Anfrage wurde gesendet.", "success");
    } catch (err) {
      message = err instanceof Error ? err.message : "Account konnte nicht beantragt werden.";
      pushToast(message, "error");
    } finally {
      authLoading = false;
    }
  };

  const loadDashboard = async () => {
    if (!$session) return;

    loadingDashboard = true;
    dashboardError = "";
    try {
      const [events, inventory] = await Promise.all([
        apiFetch<any[]>("/api/calendar", { toastOnError: false }),
        apiFetch<any[]>("/api/inventory", { toastOnError: false }).catch(() => [])
      ]);

      const now = Date.now();
      const futureEvents = events
        .filter((event) => new Date(event.end_at).getTime() >= now)
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

      upcomingEvents = futureEvents.slice(0, 3);
      lowStockItems = inventory.filter((item) => Number(item.quantity) <= Number(item.min_quantity)).slice(0, 3);

      const responseChecks = await Promise.all(
        futureEvents.slice(0, 8).map(async (event) => {
          try {
            const availability = await apiFetch<{ entries?: { user_id: string }[] }>(
              `/api/calendar/${event.id}/availability`,
              { toastOnError: false }
            );
            const responded = (availability.entries ?? []).some((entry) => entry.user_id === $session?.id);
            return responded ? null : event;
          } catch {
            return null;
          }
        })
      );

      openResponses = responseChecks.filter(Boolean);
    } catch {
      dashboardError = "Die Übersicht konnte nicht vollständig geladen werden.";
      pushToast(dashboardError, "error");
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
  <section class="auth-screen auth-screen--minimal">
    <div class="auth-card auth-card--minimal">
      <div class="auth-logo">
        <Logo size={30} />
      </div>

      {#if authMode === "requested"}
        <div class="auth-confirmation">
          <p>Dein Account wurde beantragt.</p>
          <HeroButton tone="primary" type="button" onClick={() => (authMode = "login")}>Zurück zum Login</HeroButton>
        </div>
      {:else}
        <form class="auth-form" on:submit|preventDefault={authMode === "login" ? login : requestAccount}>
          <div class="field">
            <label for="username">Benutzername</label>
            <input
              id="username"
              class="input"
              class:input-invalid={Boolean(fieldErrors.username)}
              type="text"
              bind:value={username}
              autocomplete="username"
              maxlength="120"
              required
              aria-invalid={fieldErrors.username ? "true" : "false"}
            />
            {#if fieldErrors.username}
              <p class="field-error">{fieldErrors.username}</p>
            {/if}
          </div>

          <div class="field">
            <label for="password">Passwort</label>
            <input
              id="password"
              class="input"
              class:input-invalid={Boolean(fieldErrors.password)}
              type="password"
              bind:value={password}
              autocomplete="current-password"
              maxlength="200"
              minlength="8"
              required
              aria-invalid={fieldErrors.password ? "true" : "false"}
            />
            {#if fieldErrors.password}
              <p class="field-error">{fieldErrors.password}</p>
            {/if}
          </div>

          <button class="btn btn-primary" type="submit" disabled={authLoading}>
            {#if authLoading}
              <span class="btn-spinner" aria-hidden="true"></span>
            {/if}
            {authLoading ? "Senden..." : authMode === "login" ? "Einloggen" : "Account beantragen"}
          </button>

          <button
            class="auth-link"
            type="button"
            disabled={authLoading}
            on:click={() => {
              message = "";
              authMode = authMode === "login" ? "request" : "login";
            }}
          >
            {authMode === "login" ? "Kein Zugang? Account beantragen" : "Zurück zum Login"}
          </button>

          {#if message}
            <p class="status-banner error">{message}</p>
          {/if}
        </form>
      {/if}
    </div>
  </section>
{:else}
  <div class="page-stack">
    <section class="page-intro">
      <h1 class="page-title">Übersicht</h1>
    </section>

    {#if dashboardError}
      <p class="status-banner error">{dashboardError}</p>
    {/if}

    <section class="dashboard-grid">
      <Card title="Nächste Termine" interactive={true}>
        <div slot="actions">
          <span class="count-pill">{upcomingEvents.length}</span>
        </div>

        {#if loadingDashboard}
          <p class="text-muted">Laden...</p>
        {:else if upcomingEvents.length === 0}
          <p class="text-muted">Keine Termine.</p>
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

      <Card title="Material Status" interactive={true}>
        <div slot="actions">
          <span class="count-pill">{lowStockItems.length}</span>
        </div>

        {#if loadingDashboard}
          <p class="text-muted">Laden...</p>
        {:else if lowStockItems.length === 0}
          <p class="text-muted">Keine Einträge.</p>
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

      <Card title="Offene Rückmeldungen" interactive={true}>
        <div slot="actions">
          <span class="count-pill">{openResponses.length}</span>
        </div>

        {#if loadingDashboard}
          <p class="text-muted">Laden...</p>
        {:else if openResponses.length === 0}
          <p class="text-muted">Keine offenen Rückmeldungen.</p>
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
