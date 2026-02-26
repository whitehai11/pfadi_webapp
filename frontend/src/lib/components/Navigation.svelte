<script lang="ts">
  import Icon from "$lib/components/Icon.svelte";
  import Logo from "$lib/components/Logo.svelte";

  export let items: {
    href: string;
    label: string;
    icon:
      | "home"
      | "calendar"
      | "inventory"
      | "nfc"
      | "packlist"
      | "settings"
      | "admin";
  }[] = [];
  export let currentPath = "/";
  export let username = "";
  export let role = "";
  export let open = false;
  export let onToggle: (() => void) | undefined = undefined;
  export let onLogout: (() => void) | undefined = undefined;

  const isActive = (href: string) => {
    if (href === "/") return currentPath === "/";
    return currentPath === href || currentPath.startsWith(`${href}/`);
  };

  const initials = username
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
</script>

<header class="app-topbar">
  <div class="app-topbar__inner">
    <a class="app-brand" href="/">
      <span class="app-brand__mark">
        <Logo size={22} />
      </span>
      <span>
        <strong>Pfadfinder</strong>
        <small>Organisation</small>
      </span>
    </a>

    <button
      class="app-nav-toggle"
      type="button"
      aria-expanded={open}
      aria-controls="main-nav"
      on:click={() => onToggle?.()}
    >
      <Icon name="menu" size={16} />
      <span>Menü</span>
    </button>

    <nav id="main-nav" class:open class="app-nav">
      {#each items as item}
        <a class:active={isActive(item.href)} href={item.href}>
          <Icon name={item.icon} size={16} />
          <span>{item.label}</span>
        </a>
      {/each}
    </nav>

    <div class="app-user">
      <div class="app-user__meta">
        <strong>{username}</strong>
        <span>{role}</span>
      </div>
      <div class="app-user__avatar" aria-hidden="true">{initials || "P"}</div>
      <button class="icon-button subtle-button" type="button" aria-label="Abmelden" on:click={() => onLogout?.()}>
        <Icon name="logout" size={16} />
      </button>
    </div>
  </div>
</header>
