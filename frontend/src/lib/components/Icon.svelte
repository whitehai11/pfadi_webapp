<script lang="ts">
  export let name:
    | "home"
    | "calendar"
    | "inventory"
    | "nfc"
    | "packlist"
    | "settings"
    | "admin"
    | "menu"
    | "logout"
    | "bell"
    | "box"
    | "checklist"
    | "users"
    | "sparkles"
    | "chevron"
    | "person" = "sparkles";
  export let size = 18;
</script>

<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  {#if name === "home"}
    <path fill="currentColor" d="M12 3l9 7v10a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2V10l9-7z" />
  {:else if name === "calendar"}
    <path fill="currentColor" d="M7 2h2v2h6V2h2v2h3a2 2 0 0 1 2 2v13a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2h3V2zm13 8H4v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9z" />
  {:else if name === "inventory" || name === "box"}
    <path fill="currentColor" d="M4 7.5L12 3l8 4.5v9L12 21l-8-4.5v-9zm8 3L6 7.3v7l6 3.4 6-3.4v-7L12 10.5z" />
  {:else if name === "nfc"}
    <path fill="currentColor" d="M4 8a8 8 0 0 1 8-8v2a6 6 0 0 0-6 6H4zm0 4a12 12 0 0 1 12-12v2A10 10 0 0 0 6 12H4zm0 4A16 16 0 0 1 20 0v2A14 14 0 0 0 6 16H4zm6-3a2 2 0 1 1 4 0 2 2 0 0 1-4 0z" />
  {:else if name === "packlist" || name === "checklist"}
    <path fill="currentColor" d="M9 3h6a2 2 0 0 1 2 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2-2zm0 2v2h6V5H9zm1.4 8.8L8.5 12l-1.4 1.4 3.3 3.3 6.5-6.5-1.4-1.4-5.1 5.1z" />
  {:else if name === "settings"}
    <path fill="currentColor" d="M19.4 13a7.7 7.7 0 0 0 .1-2l2-1.5-2-3.5-2.4 1a7.8 7.8 0 0 0-1.7-1L15 2h-6l-.4 4a7.8 7.8 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.7 7.7 0 0 0 .1 2l-2 1.5 2 3.5 2.4-1a7.8 7.8 0 0 0 1.7 1L9 22h6l.4-4a7.8 7.8 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z" />
  {:else if name === "admin" || name === "users"}
    <path fill="currentColor" d="M9 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm8 1a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM9 13c3.3 0 6 1.8 6 4v2H3v-2c0-2.2 2.7-4 6-4zm8 1c2.2 0 4 1.3 4 3v2h-4.5v-1.5c0-1.1-.4-2.1-1.1-3 .2 0 .4-.5 1.6-.5z" />
  {:else if name === "menu"}
    <path fill="currentColor" d="M4 7h16v2H4V7zm0 4h16v2H4v-2zm0 4h16v2H4v-2z" />
  {:else if name === "logout"}
    <path fill="currentColor" d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5v-2H5V5h5V3zm8.6 8l-2.8-2.8-1.4 1.4 1.4 1.4H9v2h6.8l-1.4 1.4 1.4 1.4 2.8-2.8a1 1 0 0 0 0-1.4z" />
  {:else if name === "bell"}
    <path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 1 0-14 0v5l-2 2v1h18v-1l-2-2z" />
  {:else if name === "person"}
    <path fill="currentColor" d="M12 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0 2c4.4 0 8 2.2 8 5v3H4v-3c0-2.8 3.6-5 8-5z" />
  {:else if name === "chevron"}
    <path fill="currentColor" d="M8.6 5.6L15 12l-6.4 6.4 1.4 1.4L17.8 12 10 4.2 8.6 5.6z" />
  {:else}
    <path fill="currentColor" d="M12 2l2.2 5.8L20 10l-5.8 2.2L12 18l-2.2-5.8L4 10l5.8-2.2L12 2z" />
  {/if}
</svg>
