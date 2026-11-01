param([string]$Python = '')
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (!$Python) { $Python = $env:GT_SOLVER_PYTHON }
if (!$Python) {
    $bundledPython = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
    $Python = if (Test-Path -LiteralPath $bundledPython) { $bundledPython } else { 'python' }
}
New-Item -ItemType Directory -Force -Path (Join-Path $PSScriptRoot 'data\tmp') | Out-Null
$env:TMP = Join-Path $PSScriptRoot 'data\tmp'
$env:TEMP = $env:TMP
if (!(Test-Path -LiteralPath '.venv\Scripts\python.exe')) {
    & $Python -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the Python environment. Install Python 3.11 or 3.12, then rerun with -Python pointing to python.exe.' }
}
& '.\.venv\Scripts\python.exe' -m ensurepip --upgrade
if ($LASTEXITCODE -ne 0) { throw 'Could not initialize pip.' }
& '.\.venv\Scripts\python.exe' -m pip install -r requirements-solver.txt
if ($LASTEXITCODE -ne 0) { throw 'Could not install OR-Tools.' }
& '.\.venv\Scripts\python.exe' -c 'from ortools.sat.python import cp_model; print("CP-SAT is ready.")'
if ($LASTEXITCODE -ne 0) { throw 'CP-SAT installation check failed.' }
