## Why

Layer 0–4 已把方法论做成**自持、过程驱动**的体系:校验/回归/裁决各是独立 Python 脚本,靠人手动触发,输出是人读文本 + exit code。在 DSH / Claude Code / Codex / OpenCode 这类成熟 agent 工具里,这等于**每次都要人记得敲命令、再看文本判断**——自动化程度低,且 agent 无法程序化反应。

本 change 立起**集成适配层**(外挂层,不属于五层方法论):把"多步人工触发"收成一个**单一网关**,把结果统一成**版本化 JSON 契约**,并在 DSH 的 **Cordis 插件**层提供模型工具 + 卡片 UI + 技能触发。**核心五层一行不改**。

## What Changes

- **新增单一网关 `meta/integrations/gateway.py`**(harness 无关):`snapshot | check | bench | judge | gate` 五个子命令;stdout 恰好一个 JSON 信封,stderr 人读日志;exit `0/1/2`。它 **subprocess 调 core 脚本、以 exit code 为唯一权威判决、把 judge 打印的条件行原样结构化**——本层不含任何"吸收是否合规"的判断逻辑。
- **新增信封契约 `meta/integrations/schemas/verdict.schema.json`**(版本化,可 jsonschema 校验):三条件 `record/bench/addonly` 的结构化搬运、步骤明细、只读快照。
- **新增 DSH 适配 `meta/integrations/dsh/`**:Cordis 动态插件 Host 半(5 个模型工具 `methodology_status|check|bench|judge|gate` + 包内 RPC)、Client 半(`tool.view.cordis` 的 `self` 键判决面板)、`build_payload.py`(由源生成 `cordis_define` 入参,避免手工抄写漂移)。
- **新增触发面技能**:`meta/integrations/dsh/skills/methodology-gate`、`methodology-capture-retro`(源),副本进 `.agents/skills/`(DSH 技能发现根)。
- **新增宿主契约自检 `meta/integrations/dsh/tests/verify-adapter.mjs`**:用 **DSH 自带的真实校验器** 钉住沙箱求值方式、参数/输出 schema 子集、真实信封跑 `execute`、RPC、slot 协议。
- **纪律**:领域性失败(judge REJECT / bench FAIL)以**成功的工具调用 + 结构化 `ok=false`** 返回,不抛错;只有网关自身故障(exit 2)才抛错。
- **不改**:frame、metaschema、`meta/skills/*`、engine、evolution、`scripts/check.py` 一律不动;不改任何 `targets/` 产物;吸收仍 = 发起版本化方法论 change。

## Capabilities

### New Capabilities
- `methodology/integration-adapter`: 集成适配层契约——单一网关入口与机器可读信封、DSH Cordis 插件接线(工具/RPC/UI/技能)、宿主契约自检、以及"只搬运不裁决"的边界。

### Modified Capabilities
<!-- 无既有能力被修改:本层是外挂层,核心五层契约不变 -->

## Impact

- 新增:`/meta/integrations/`(`README.md`、`gateway.py`、`schemas/verdict.schema.json`、`dsh/{README.md,dynamic/*,skills/*,tests/*}`)、`/.agents/skills/{methodology-gate,methodology-capture-retro}/SKILL.md`、本 change 记录。
- 复用:core 的 `check.py` / `bench.py` / `judge.py` / `engine.py` / `frame.yaml` / `metaschema/` / `retro.md` —— 只读调用,零修改。
- 依赖:无新增 Python 依赖(仅用 stdlib + uv 环境里已有的 PyYAML/jsonschema);DSH 侧零安装(动态插件)。
- 未交付(记为后续):常驻 bundle(`dsh.bundle` + `cordis.patch.yml`),理由见 `design.md` 与 `/meta/integrations/dsh/README.md`。
