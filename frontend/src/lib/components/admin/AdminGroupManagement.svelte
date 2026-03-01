<script lang="ts">
  import { onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import { apiFetch } from "$lib/api";
  import { pushToast } from "$lib/toast";

  type UserRow = {
    id: string;
    email: string;
    role: "admin" | "dev" | "user" | "materialwart";
    status: "pending" | "approved" | "rejected";
  };

  let loading = true;
  let users: UserRow[] = [];

  const load = async () => {
    loading = true;
    try {
      users = await apiFetch<UserRow[]>("/api/admin/users");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Gruppen konnten nicht geladen werden.", "error");
    } finally {
      loading = false;
    }
  };

  const countByRole = (role: UserRow["role"]) => users.filter((user) => user.role === role).length;
  const approvedByRole = (role: UserRow["role"]) =>
    users.filter((user) => user.role === role && user.status === "approved").length;

  onMount(() => {
    void load();
  });
</script>

<section class="section-block">
  <h2 class="section-title">Gruppen</h2>
  <div class="grid-3">
    <Card title="Nutzer">
      <strong>{approvedByRole("user")}</strong>
      <p class="text-muted">von {countByRole("user")} insgesamt</p>
    </Card>
    <Card title="Materialwarte">
      <strong>{approvedByRole("materialwart")}</strong>
      <p class="text-muted">von {countByRole("materialwart")} insgesamt</p>
    </Card>
    <Card title="Admins">
      <strong>{approvedByRole("admin")}</strong>
      <p class="text-muted">von {countByRole("admin")} insgesamt</p>
    </Card>
  </div>
</section>
