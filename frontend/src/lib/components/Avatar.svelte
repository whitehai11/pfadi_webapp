<script lang="ts">
  export let name = "";
  export let avatarUrl: string | null = null;
  export let size = 40;

  let imageFailed = false;

  const initials = (value: string) => {
    const parts = value
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  };

  const colorForName = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue} 46% 78%)`;
  };

  $: label = initials(name || "U");
  $: fallbackColor = colorForName(name || "user");
  $: showImage = Boolean(avatarUrl) && !imageFailed;
</script>

<div
  class="avatar"
  style={`width:${size}px;height:${size}px;${showImage ? "" : `background:${fallbackColor};`}`}
  aria-label={name || "Avatar"}
>
  {#if showImage}
    <img src={avatarUrl || ""} alt={name || "Avatar"} on:error={() => (imageFailed = true)} />
  {:else}
    <span>{label}</span>
  {/if}
</div>

<style>
  .avatar {
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-default);
    font-weight: 700;
    font-size: 0.86rem;
    overflow: hidden;
    flex: 0 0 auto;
    user-select: none;
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
</style>
