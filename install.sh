#!/bin/sh
# =============================================================================
# 方法论工具体系 —— 一键安装脚本 (POSIX)
# -----------------------------------------------------------------------------
# 职责:clone(或更新)本体仓库到 --dest、uv sync 装依赖、gateway 冒烟校验。
# 刻意不做的事:不替用户装 git/uv(只探测并指路);不触碰 targets/(对象层
# 是用户的实践产物);不做 target 全局发现(另一演进项)。
#
# 用法:
#   curl -fsSL <raw-url>/install.sh | sh -s -- --repo <git-url> [--version <tag>] [--dest <dir>]
#   sh install.sh --repo <git-url> --version v0.1.0 --dest ~/.local/share/ontology-methodology
#
# 私有仓库提示:raw URL 需要 token 时,用 git 通道(手动 clone 后在仓库根
# 执行本脚本并 --dest 指向该 clone)——这是一等通道,不是回退。
# =============================================================================
set -eu

REPO=""
VERSION=""
DEST="${METHODOLOGY_INSTALL_DEST:-$HOME/.local/share/ontology-methodology}"

while [ $# -gt 0 ]; do
  case "$1" in
    --repo)    REPO="$2"; shift 2 ;;
    --version) VERSION="$2"; shift 2 ;;
    --dest)    DEST="$2"; shift 2 ;;
    *) echo "未知参数: $1(支持 --repo/--version/--dest)" >&2; exit 64 ;;
  esac
done

say()  { printf '[install] %s\n' "$*"; }
die()  { printf '[install] 失败: %s\n' "$*" >&2; exit 1; }

# --- 探测依赖:指路,不代装 ---------------------------------------------------
command -v git >/dev/null 2>&1 || die "缺少 git。请先安装:https://git-scm.com/downloads"
if ! command -v uv >/dev/null 2>&1; then
  say "缺少 uv。安装命令(任选其一):"
  say "  curl -LsSf https://astral.sh/uv/install.sh | sh"
  say "  pipx install uv    /    pip install uv"
  die "装好 uv 后重新运行本脚本"
fi

# --- 克隆或更新(版本可预期优先;拒绝 diverge,不静默 reset)------------------
if [ ! -d "$DEST/.git" ]; then
  say "全新安装 -> $DEST"
  if [ -n "$VERSION" ]; then
    git clone --depth 1 --branch "$VERSION" "$REPO" "$DEST" || die "clone 失败(检查 --repo/--version 与网络)"
  else
    git clone --depth 1 "$REPO" "$DEST" || die "clone 失败(检查 --repo 与网络)"
  fi
else
  say "已存在 -> $DEST,更新到 ${VERSION:-默认分支头}"
  cd "$DEST"
  git fetch --tags --force || die "fetch 失败(网络?)"
  if [ -n "$VERSION" ]; then
    git checkout "$VERSION" 2>/dev/null || die "checkout $VERSION 失败(tag/分支不存在?)"
  fi
  # diverge 时失败退出,由用户决定;绝不 reset
  git pull --ff-only || die "本地有分叉(ff-only 拒绝)。请手动处理 $DEST 后重试"
fi

cd "$DEST"

# --- 依赖就绪(仓库内缓存,沙箱/只读 HOME 友好)-------------------------------
say "uv sync(meta/scripts)"
uv sync --project meta/scripts || die "uv sync 失败(检查 uv.lock 与网络)"

# --- 冒烟:snapshot 出合法 JSON 信封才算装好 ---------------------------------
say "冒烟校验:gateway.py snapshot"
export UV_CACHE_DIR="$DEST/.uv-cache" UV_PYTHON_INSTALL_DIR="$DEST/.uv-python"
if command -v meta/scripts/.venv/bin/python >/dev/null 2>&1; then
  PY=meta/scripts/.venv/bin/python
else
  PY="uv run --project meta/scripts python"
fi
ENVELOPE=$($PY meta/integrations/gateway.py snapshot) || die "snapshot 运行失败(见上方输出)"
printf '%s' "$ENVELOPE" | "$PY" -c '
import json, sys
sys.path.insert(0, "meta/scripts")
try:
    from jsonschema import Draft7Validator
except ImportError:
    sys.exit(0)  # jsonschema 缺失时退化为"是合法 JSON 即可",不阻断安装
import pathlib
schema = json.loads(pathlib.Path("meta/integrations/schemas/verdict.schema.json").read_text())
env = json.load(sys.stdin)
Draft7Validator(schema).validate(env)
' || die "snapshot 输出未过 verdict.schema.json 校验(信封契约被破坏?)"

say "装好: $DEST"
say "验证:  cd $DEST && $PY meta/integrations/gateway.py snapshot"
say "注意:  DSH 适配壳的 RUNNER 为 POSIX 片段——Windows 上本体可用,DSH 内 5 个工具暂不可用(待独立 change 修)。"
