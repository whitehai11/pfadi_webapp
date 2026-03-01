<script lang="ts">
import Icon from "$lib/components/Icon.svelte";
import Logo from "$lib/components/Logo.svelte";
import NotificationMenu from "$lib/components/NotificationMenu.svelte";
import Avatar from "$lib/components/Avatar.svelte";
import { overlayOutside } from "$lib/overlay";

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
      | "admin"
      | "chat";
  }[] = [];
  export let currentPath = "/";
  export let username = "";
  export let role = "";
  export let avatarUrl: string | null = null;
  export let open = false;
  export let onToggle: (() => void) | undefined = undefined;
  export let onLogout: (() => void) | undefined = undefined;
  export let theme: "light" | "dark" = "light";
  export let onToggleTheme: (() => void) | undefined = undefined;
  export let overlayId = "";

  const isActive = (href: string) => {
    if (href === "/") return currentPath === "/";
    return currentPath === href || currentPath.startsWith(`${href}/`);
  };

</script>

<header class="app-topbar" use:overlayOutside={{ id: overlayId, enabled: open }}>
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
      <NotificationMenu />
      <button
        class="icon-button subtle-button"
        type="button"
        aria-label={theme === "dark" ? "Helles Theme aktivieren" : "Dunkles Theme aktivieren"}
        on:click={() => onToggleTheme?.()}
      >
        <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
      </button>
      <div class="app-user__meta">
        <strong>{username}</strong>
        <span>{role}</span>
      </div>
      <Avatar name={username} {avatarUrl} size={40} />
      <button class="icon-button subtle-button" type="button" aria-label="Abmelden" on:click={() => onLogout?.()}>
        <Icon name="logout" size={16} />
      </button>
    </div>
  </div>
</header>
