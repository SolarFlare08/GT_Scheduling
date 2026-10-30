$ErrorActionPreference = 'Stop'
$listener = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
  Write-Host 'A server is already listening on port 3000. Open http://127.0.0.1:3000'
  exit 0
}
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  $node = Get-ChildItem (Join-Path $env:LOCALAPPDATA 'Codex\runtimes') -Filter node.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
}
if (-not $node) {
  Write-Error 'Node.js was not found. Install Node.js 24 or later, then reopen PowerShell.'
}
$nodePath = if ($node.Source) { $node.Source } else { $node.FullName }
$serverPath = Join-Path $PSScriptRoot 'server.mjs'
Start-Process -FilePath $nodePath -ArgumentList @($serverPath) -WorkingDirectory $PSScriptRoot -WindowStyle Normal
Start-Sleep -Seconds 2
try {
  Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -TimeoutSec 5 | Out-Null
  Start-Process 'http://127.0.0.1:3000'
  Write-Host 'Scheduler started. Leave its Node window open while using the app.'
} catch {
  Write-Error 'The scheduler did not respond. Check the Node window for its error.'
}
