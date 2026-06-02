# Copy homelab Convex + RustFS variable names from pindeck into review-room .env.local.
# Fill secrets locally; never commit .env.local.

$pindeck = Join-Path (Split-Path $PSScriptRoot -Parent) "..\pindeck\.env.local"
$target = Join-Path (Split-Path $PSScriptRoot -Parent) ".env.local"

if (-not (Test-Path $pindeck)) {
  Write-Error "pindeck .env.local not found at $pindeck"
}

$map = @{
  "VITE_CONVEX_URL" = "NEXT_PUBLIC_CONVEX_URL"
  "VITE_CONVEX_SITE_URL" = "NEXT_PUBLIC_CONVEX_SITE_URL"
}

$lines = Get-Content $pindeck
$out = @(
  "# Generated from pindeck homelab — $(Get-Date -Format o)",
  "# Pindeck VITE_* variables are converted to Review Room NEXT_PUBLIC_* names.",
  ""
)

foreach ($line in $lines) {
  if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
  foreach ($key in $map.Keys) {
    if ($line -match "^${key}=(.+)$") {
      $out += "$($map[$key])=$($matches[1])"
    }
  }
  if ($line -match '^CONVEX_SELF_HOSTED_URL=(.+)$') { $out += $line }
  if ($line -match '^CONVEX_SELF_HOSTED_ADMIN_KEY=(.+)$') { $out += $line }
}

$out += ""
$out += "# Add RustFS S3_* from your homelab (see .env.example)"
Copy-Item $target "$target.bak" -ErrorAction SilentlyContinue
$out | Set-Content $target -Encoding utf8
Write-Host "Wrote $target — add S3_*; set JWT on Convex deployment (see docs/deploy-vercel-and-auth.md)."
