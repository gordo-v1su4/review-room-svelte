param(
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")

function Stop-PortListener {
  param([int]$TargetPort)

  $connections = Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction SilentlyContinue
  if (-not $connections) {
    return
  }

  $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($processId in $processIds) {
    if (-not $processId) {
      continue
    }

    Write-Host "Stopping process $processId on port $TargetPort..."
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
  }

  Start-Sleep -Seconds 1
}

Stop-PortListener -TargetPort $Port

$remaining = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($remaining) {
  throw "Port $Port is still in use after stopping its listener."
}

Set-Location $root
& bunx next dev --turbopack --port $Port
