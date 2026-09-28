## Context

本体只有手动落地方式;集成侧 bundle 已通道无关。约束:不改 core/gateway;安装器是外挂交付物;`curl | sh` 需可审计;Windows 现状如实标注不撒谎。

## Goals / Non-Goals

**Goals:**
- 一条命令完成:clone(或更新)→ uv sync → 冒烟验证。
- 幂等且不破坏对象层(重复跑=更新到 tag,`targets/` 不动)。
- 脚本短小可通读(目标 ~80 行内),默认可审计的 git clone 而非盲执行。

**Non-Goals:**
- 不替用户装 git/uv(探测 + 指路)。
- 不修 Windows 的 RUNNER(独立 change;此处只标注)。
- 不做 target 全局发现 / METHODOLOGY_ROOT / "工具全局装、项目任意放"(另一演进项)。
- 不做 npm/版本登记(本体版本 = git tag)。

## Decisions

1. **安装器放仓库根**(`/install.sh`、`/install.ps1`):raw URL 一层即达,`curl -fsSL <raw>/install.sh | sh` 成立。
2. **默认 tag 而非分支头**:`--version <tag>` 必填或默认最新 tag;`clone --depth 1 --branch`。已存在目录走 `fetch + checkout <tag> + ff-only`(拒绝 diverge,提示手动处理)——版本可预期优先于便利。
3. **冒烟 = 信封校验**:装好后跑 `gateway.py snapshot`,输出过 `verdict.schema.json` Draft-07 校验(exit 0 且合法 JSON)才算成功;失败即整体失败并保留目录供排查。
4. **不碰 `targets/`**:更新只影响 meta/ 与脚本;对象层(用户的实践产物)绝不删改。
5. **git 通道一等**:私有仓库 raw 需 token,文档把"手动 clone + 本地跑脚本"列为同等地位,不叫回退。
6. **uv 探测指路不代装**:缺 uv 打印官方安装命令(如 `curl -LsSf https://astral.sh/uv/install.sh | sh`)并退出非零。
7. **PowerShell 版对等**:`install.ps1` 同逻辑;`cmd` 用户经 `powershell -File install.ps1` 走同一脚本,不做第三份。

## Risks / Trade-offs

- [curl|sh 供应链顾虑] → 脚本极简可通读;默认路径是 git clone(可审计);给出 checksum 选项(`--verify <sha>` 对 tarball)留待需要时加。
- [已存在目录 diverge] → ff-only 失败即停,提示手动处理;不静默 reset。
- [Windows 期望落差] → 文档明示本体可用、DSH 工具挂 RUNNER;安装器输出里也带一行提示。
- [README 与安装器漂移] → README 快速上手改为指向安装器,手动步骤降为"离线/高级",单一事实源。

## Migration Plan

1. 写 install.sh / install.ps1。2. 本机以临时 dest 实测:全新安装、重复安装(幂等)、冒烟失败路径(临时改坏 tag)。3. README/integrations README 更新。4. 回滚:删两脚本 + 还原两个 README + git。

## Open Questions

无(默认 dest、tag 策略均已定)。
