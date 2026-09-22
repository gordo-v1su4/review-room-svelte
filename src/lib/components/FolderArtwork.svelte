<script lang="ts">
  let { label = '', empty = false, coverSrc }: { label?: string; empty?: boolean; coverSrc?: string } = $props();
  const uid = $props.id();
</script>

<svg
  class="folder-artwork"
  viewBox="0 0 240 213"
  role={label ? 'img' : 'presentation'}
  aria-label={label || undefined}
  aria-hidden={label ? undefined : 'true'}
  preserveAspectRatio="xMidYMid meet"
>
  <defs>
    <linearGradient id={`${uid}-back`} x1="0" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="#292c2b" />
      <stop offset="0.45" stop-color="#232625" />
      <stop offset="1" stop-color="#171a19" />
    </linearGradient>
    <linearGradient id={`${uid}-paper`} x1="0" y1="0" x2="0.85" y2="1">
      <stop offset="0" stop-color="#c7d5d1" />
      <stop offset="0.62" stop-color="#aebfba" />
      <stop offset="1" stop-color="#8c9d98" />
    </linearGradient>
    <linearGradient id={`${uid}-front`} x1="0.04" y1="0" x2="0.96" y2="1">
      <stop offset="0" stop-color="#737776" />
      <stop offset="0.35" stop-color="#555b58" />
      <stop offset="0.78" stop-color="#444b48" />
      <stop offset="1" stop-color="#363d3a" />
    </linearGradient>
    <linearGradient id={`${uid}-edge`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.2" />
      <stop offset="0.45" stop-color="#ffffff" stop-opacity="0.04" />
      <stop offset="1" stop-color="#000000" stop-opacity="0.24" />
    </linearGradient>
    <filter id={`${uid}-shadow`} x="-20%" y="-20%" width="140%" height="160%">
      <feGaussianBlur stdDeviation="7" />
    </filter>
    <filter id={`${uid}-through`} x="-30%" y="-20%" width="160%" height="150%">
      <feGaussianBlur stdDeviation="11" />
    </filter>
    <clipPath id={`${uid}-body`}>
      <path d="M28 74c0-11 8-19 19-19h74c5 0 8 1 13 4l20 11c4 2 8 3 14 3h24c12 0 20 9 20 21v69c0 12-9 21-21 21H49c-12 0-21-9-21-21z"/>
    </clipPath>
    <clipPath id={`${uid}-cover`}><rect x="42" y="91" width="156" height="77" rx="5"/></clipPath>
    <filter id={`${uid}-soft`} x="-10%" y="-10%" width="120%" height="130%">
      <feGaussianBlur stdDeviation="1.6" />
    </filter>
  </defs>

  <ellipse cx="120" cy="194" rx="82" ry="10" fill="#000" opacity="0.42" filter={`url(#${uid}-shadow)`} />

  <!-- The reference has a softly rounded rear wall, not an extra tab. -->
  <rect x="28" y="28" width="180" height="135" rx="24" fill={`url(#${uid}-back)`} stroke="#87928d" stroke-opacity="0.08" />

  {#if !empty}
  <!-- Layered sheets trace the reference's asymmetric paper stack. -->
  <path d="M42 69V48c0-3 2-5 5-6l52-13 49 24v16z" fill="#adbab4" />
  <path d="M86 71V36c0-4 3-6 7-6h46l16 15v26z" fill={`url(#${uid}-paper)`} stroke="#dce7e1" stroke-opacity="0.16" />
  <path d="M135 39l47 11 13 21h-41l-22-12z" fill="#c3d0ca" />
  <path d="m139 31 16 14-19-3z" fill="#d8e3de" opacity="0.5" />

  <!-- Paper silhouettes diffuse through the smoked front rather than stopping at its lip. -->
  <g clip-path={`url(#${uid}-body)`}>
    <g filter={`url(#${uid}-through)`} opacity="0.5">
      <path d="M66 48h67l12 14v79H66z" fill="#c4d2ce"/>
      <path d="M102 57h49l15 13v75h-64z" fill="#aebfba"/>
      <path d="M48 71h48l13 14v64H48z" fill="#a7b6b1"/>
    </g>
  </g>

  {/if}
  <!-- Reference front proportions: 184 wide × 129 tall (~1.43:1). -->
  <!-- Translucent smoked front with a thin polished rim. -->
  <path d="M28 74c0-11 8-19 19-19h74c5 0 8 1 13 4l20 11c4 2 8 3 14 3h24c12 0 20 9 20 21v69c0 12-9 21-21 21H49c-12 0-21-9-21-21z" fill={`url(#${uid}-front)`} fill-opacity="0.73" stroke="#a2b4ab" stroke-opacity="0.2" stroke-width="0.9" />
  {#if coverSrc}
    <g clip-path={`url(#${uid}-cover)`}>
      <image href={coverSrc} x="42" y="91" width="156" height="77" preserveAspectRatio="xMidYMid slice"/>
      <rect x="42" y="91" width="156" height="77" fill="#0a1713" opacity="0.12"/>
    </g>
    <rect x="42" y="91" width="156" height="77" rx="5" fill="none" stroke="#d3e5dd" stroke-opacity="0.12" stroke-width="0.8"/>
  {/if}
  <path d="M30 74c0-10 7-17 17-17h74c4 0 7 1 12 4l20 11c5 2 9 3 15 3h24c10 0 18 8 18 19" fill="none" stroke="#c6d3cc" stroke-opacity="0.14" stroke-width="0.8" />
  {#if label}
    <text x="120" y="111" text-anchor="middle" fill="#c9cdcd" opacity="0.54" font-size="11" font-family="Inter, ui-sans-serif, sans-serif" letter-spacing="0.04em">{label}</text>
  {/if}
</svg>

<style>
  .folder-artwork {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }
</style>
