<script lang="ts">
  import { onMount } from "svelte";
  import { apiFetch } from "$lib/api";
  import { pushToast } from "$lib/toast";
  import HeroButton from "$lib/components/heroui/HeroButton.svelte";

  type MatrixUser = {
    matrix_user_id: string;
    created_at: string;
    email: string | null;
  };

  let users: MatrixUser[] = [];
  let loading = true;
  let creating = false;

  let localpart = "";
  let password = "";
  let formError = "";

  async function load() {
    loading = true;
    try {
      const data = await apiFetch<MatrixUser[]>("/api/matrix/admin/users");
      users = data ?? [];
    } catch {
      // error toast shown by apiFetch
    } finally {
      loading = false;
    }
  }

  async function createUser() {
    formError = "";
    if (!localpart.trim() || !password.trim()) {
      formError = "Bitte Benutzername und Passwort angeben.";
      return;
    }
    if (!/^[a-z0-9._-]+$/.test(localpart)) {
      formError = "Nur Kleinbuchstaben, Ziffern, . _ - erlaubt.";
      return;
    }
    creating = true;
    try {
      await apiFetch("/api/matrix/admin/users", {
        method: "POST",
        body: JSON.stringify({ localpart, password })
      });
      pushToast(`Matrix-User @${localpart} erstellt.`, "success");
      localpart = "";
      password = "";
      await load();
    } catch {
      // toast shown by apiFetch
    } finally {
      creating = false;
    }
  }

  onMount(load);
</script>

<div class="matrix-admin">
  <div class="section">
    <h3 class="section-title">Neuen Matrix-User erstellen</h3>
    <p class="hint">Der User wird automatisch zum Pfadi-Raum hinzugefügt.</p>

    <div class="form-row">
      <div class="field">
        <label for="mx-localpart">Benutzername (localpart)</label>
        <div class="input-prefix-wrap">
          <span class="prefix">@</span>
          <input
            id="mx-localpart"
            type="text"
            bind:value={localpart}
            placeholder="z.b. anna"
            autocomplete="off"
            spellcheck="false"
          />
          <span class="suffix">:matrix.uvh.maro.run</span>
        </div>
      </div>

      <div class="field">
        <label for="mx-password">Passwort</label>
        <input
          id="mx-password"
          type="password"
          bind:value={password}
          placeholder="Mindestens 8 Zeichen"
          autocomplete="new-password"
        />
      </div>
    </div>

    {#if formError}
      <p class="form-error">{formError}</p>
    {/if}

    <HeroButton tone="primary" onClick={createUser} disabled={creating}>
      {creating ? "Wird erstellt…" : "User erstellen"}
    </HeroButton>
  </div>

  <div class="section">
    <h3 class="section-title">Bestehende Matrix-User</h3>

    {#if loading}
      <p class="hint">Lade…</p>
    {:else if users.length === 0}
      <p class="hint">Noch keine Matrix-User vorhanden.</p>
    {:else}
      <table class="mx-table">
        <thead>
          <tr>
            <th>Matrix-ID</th>
            <th>Pfadi-Account</th>
            <th>Erstellt</th>
          </tr>
        </thead>
        <tbody>
          {#each users as u (u.matrix_user_id)}
            <tr>
              <td class="mono">{u.matrix_user_id}</td>
              <td>{u.email ?? "—"}</td>
              <td>{new Date(u.created_at).toLocaleDateString("de-CH")}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>

<style>
  .matrix-admin {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .section {
    background: var(--bg-card, #1e2130);
    border-radius: 10px;
    padding: 1.5rem;
    border: 1px solid var(--border, rgba(255,255,255,0.07));
  }

  .section-title {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 0.3rem;
  }

  .hint {
    font-size: 0.85rem;
    color: var(--text-muted, #888);
    margin: 0 0 1.2rem;
  }

  .form-row {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    flex: 1;
    min-width: 200px;
  }

  label {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-muted, #aaa);
  }

  input {
    background: var(--bg-input, #12151f);
    border: 1px solid var(--border, rgba(255,255,255,0.1));
    border-radius: 6px;
    color: inherit;
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
    outline: none;
    width: 100%;
    box-sizing: border-box;
  }

  input:focus {
    border-color: var(--color-primary, #7c83ff);
  }

  .input-prefix-wrap {
    display: flex;
    align-items: center;
    background: var(--bg-input, #12151f);
    border: 1px solid var(--border, rgba(255,255,255,0.1));
    border-radius: 6px;
    overflow: hidden;
  }

  .input-prefix-wrap:focus-within {
    border-color: var(--color-primary, #7c83ff);
  }

  .prefix, .suffix {
    padding: 0.5rem 0.5rem;
    font-size: 0.85rem;
    color: var(--text-muted, #888);
    white-space: nowrap;
    user-select: none;
  }

  .input-prefix-wrap input {
    border: none;
    border-radius: 0;
    flex: 1;
    min-width: 60px;
    padding: 0.5rem 0.25rem;
  }

  .input-prefix-wrap input:focus {
    border-color: transparent;
  }

  .form-error {
    color: var(--color-danger, #ff6b6b);
    font-size: 0.85rem;
    margin: 0 0 0.75rem;
  }

  .mx-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .mx-table th {
    text-align: left;
    padding: 0.5rem 0.75rem;
    color: var(--text-muted, #888);
    font-weight: 500;
    border-bottom: 1px solid var(--border, rgba(255,255,255,0.07));
  }

  .mx-table td {
    padding: 0.6rem 0.75rem;
    border-bottom: 1px solid var(--border, rgba(255,255,255,0.05));
  }

  .mono {
    font-family: monospace;
    font-size: 0.8rem;
  }
</style>
