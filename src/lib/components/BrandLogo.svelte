<script lang="ts">
  const componentId = $props.id();
  const gradientId = `${componentId}-brand-fade`;
</script>

<svg class="brand-logo" viewBox="0 0 572 617" fill={`url(#${gradientId})`} role="img" aria-label="Review Room">
  <defs>
    <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="currentColor"/>
      <stop offset=".35" stop-color="currentColor" stop-opacity=".8"/>
      <stop offset="1" stop-color="currentColor" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <path d="M3 0H395C495 0 572 76 572 177C572 264 511 336 427 353V199C427 162 399 134 360 134H173Z"/>
  <path d="M0 617V301C0 236 52 182 116 182C129 182 143 182 155 185L570 604H370L141 375V479C141 507 129 530 107 547Z"/>
</svg>

<style>
  .brand-logo { display: block; width: var(--brand-logo-width, 38px); height: auto; flex: none; color: var(--brand-logo-color, #000); }
  :global(.sidebar .brand) .brand-logo { transform: translateY(12.5px) scale(3.5); transform-origin: top left; pointer-events: none; }
  :global(.sidebar > :not(.brand)), :global(.sidebar .sidebar-collapse) { position: relative; z-index: 1; }
</style>
