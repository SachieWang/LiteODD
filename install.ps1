# =============================================================================
# 方法论工具体系 —— 一键安装脚本 (PowerShell;cmd 用户经 powershell -File 走此脚本)
# 与 install.sh 同逻辑:clone/更新 -> uv sync -> gateway 冒烟校验。
# 不替用户装 git/uv;不触碰 targets/;diverge 拒绝而非 reset。
# =============================================================================
param(
  [Parameter(Mandatory = $true)][string]$Repo,
  [string]$Version = "",
  [string]$Dest = ""
)

$ErrorActionPreference = 'Stop'
if (-not $Dest) {
  $Dest = Join-Path $env:USERPROFILE '.local\share\ontology-methodology'
}

function Say($msg)  { Write-Host "[install] $msg" }
function Die($msg)  { Write-Host "[install] 失败: $msg" -ForegroundColor Red; exit 1 }

# --- 探测依赖:指路,不代装 ---------------------------------------------------
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Die "缺少 git。请先安装:https://git-scm.com/downloads" }
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
  Say "缺少 uv。安装命令(任选其一):"
  Say "  powershell -ExecutionPolicy ByPass -c \"irm https://astral.sh/uv/install.ps1 | iex\""
  Say "  pip install uv    /    winget install astral-sh.uv"
  Die "装好 uv 后重新运行本脚本"
}

# --- 克隆或更新 ---------------------------------------------------------------
if (-not (Test-Path (Join-Path $Dest '.git'))) {
  Say "全新安装 -> $Dest"
  $args = @('clone', '--depth', '1')
  if ($Version) { $args += @('--branch', $Version) }
  $args += @($Repo, $Dest)
  git @args || Die "clone 失败(检查 -Repo/-Version 与网络)"
} else {
  Say "已存在 -> $Dest,更新到 $(if ($Version) { $Version } else { '默认分支头' })"
  Push-Location $Dest
  git fetch --tags --force || Die "fetch 失败(网络?)"
  if ($Version) { git checkout $Version 2>$null || Die "checkout $Version 失败(tag/分支不存在?)" }
  git pull --ff-only || Die "本地有分叉(ff-only 拒绝)。请手动处理 $Dest 后重试"
  Pop-Location
}

Push-Location $Dest

# --- 依赖就绪 -----------------------------------------------------------------
Say "uv sync(meta/scripts)"
uv sync --project meta/scripts || Die "uv sync 失败(检查 uv.lock 与网络)"

# --- 冒烟:snapshot 出合法 JSON 信封才算装好 -----------------------------------
Say "冒烟校验:gateway.py snapshot"
$env:UV_CACHE_DIR = Join-Path $Dest '.uv-cache'
$env:UV_PYTHON_INSTALL_DIR = Join-Path $Dest '.uv-python'
$venvPy = Join-Path $Dest 'meta\scripts\.venv\Scripts\python.exe'
if (Test-Path $venvPy) {
  $envelope = & $venvPy (Join-Path $Dest 'meta\integrations\gateway.py') snapshot
} else {
  $envelope = uv run --project meta/scripts python (Join-Path $Dest 'meta\integrations\gateway.py') snapshot
}
if (-not $envelope) { Die "snapshot 运行失败" }

$check = @'
import json, sys, pathlib
sys.path.insert(0, "meta/scripts")
try:
    from jsonschema import Draft7Validator
except ImportError:
    sys.exit(0)
schema = json.loads(pathlib.Path("meta/integrations/schemas/verdict.schema.json").read_text())
env = json.load(sys.stdin)
Draft7Validator(schema).validate(env)
'@
$envelope | & $venvPy -c $check || Die "snapshot 输出未过 verdict.schema.json 校验"

Pop-Location
Say "装好: $Dest"
Say "注意: DSH 适配壳的 RUNNER 为 POSIX 片段——Windows 上本体可用,DSH 内 5 个工具暂不可用(待独立 change 修)。"
