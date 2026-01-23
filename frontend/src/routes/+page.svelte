<script lang="ts">
  import { apiFetch } from "$lib/api";
  import { setToken, session } from "$lib/auth";

  let username = "";
  let password = "";
  let message = "";

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
</script>

{#if !$session}
  <section class="auth-screen">
    <div class="auth-card">
      <form class="form-grid auth-form" on:submit|preventDefault={login}>
        <div class="field">
          <label for="username">Benutzername</label>
          <input id="username" class="input" type="text" bind:value={username} placeholder="z.B. max" />
        </div>
        <div class="field">
          <label for="password">Passwort</label>
          <input id="password" class="input" type="password" bind:value={password} placeholder="Mind. 8 Zeichen" />
        </div>
        <div class="actions">
          <button class="btn btn-primary" type="submit">Login</button>
          <button class="btn btn-outline" type="button" on:click={register}>Registrieren</button>
        </div>
        {#if message}
          <p class="text-muted">{message}</p>
        {/if}
      </form>
    </div>
  </section>
{:else}
  <section class="card-grid grid-3">
    <div class="card">
      <h3 class="section-title">Kalender</h3>
      <p class="text-muted">Termine verwalten, abonnieren und synchron halten.</p>
      <a class="btn btn-outline" href="/calendar">Zum Kalender</a>
    </div>
    <div class="card">
      <h3 class="section-title">Inventar</h3>
      <p class="text-muted">Material sauber erfassen, Lagerorte und Mengen im Blick behalten.</p>
      <a class="btn btn-outline" href="/inventory">Zum Inventar</a>
    </div>
  </section>
{/if}
