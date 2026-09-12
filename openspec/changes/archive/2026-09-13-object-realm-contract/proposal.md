## Why

两处**自相矛盾**需要收口:(1) 规范遵守缺口——`meta/evolution/retro/` 里混入了 **dsh 专属的实践复盘记录**(含 `sp:terminal-seam`、`REQ-005` 等),违反我们自己的 `dual-realm-layout`("元层/对象层产物不得混放"),且这些内容会被提交进**通用方法论工具库**;(2) 对象层契约空白——`instances.yaml`/`components.yaml`/`sources.yaml` 三个目标侧文件的**形态只存在于代码硬编码假设**里,meta 层没有模板与校验,`components.yaml` 甚至无人读取,换个 agent/项目就会长得不一样,破坏"同构"。

## What Changes

- **修正 Q1(元/对象层混放)**:
  - 把 dsh 专属复盘记录从 `meta/evolution/retro/` 移到 **`targets/dsh/evolution/retro/`**(对象层实践产物)。
  - `meta/evolution/retro/accept-example.yaml` **中性化为通用合成示例**(不再引用具体 target)。
  - **meta 工具去具体目标耦合**:移除 `check.py`/`gate_rules.py`/`bench.py`/`judge.py`/`orchestrator.yaml` 中硬编码的 `default "targets/dsh"`;meta 层不得内嵌任何具体目标。
- **补齐 Q2(对象层契约)**:
  - 新增能力 `methodology/object-realm-contract`:规定目标项目对象层**必须**含 `ontology/{instances,components,sources}.yaml` 及各自**最小字段**。
  - 新增 **3 份模板** `/meta/templates/{instances,components,sources}.template.yaml`(通用,指导创建、保证同构)。
  - 新增**确定性闸门规则 `realm_structure`** 并接入 DAG(新增 `realm-check` 前置阶段),使 `components.yaml` **第一次被机器校验**(每个 `ref` 必须可解析)。
- **add-only**:仅新增能力/模板/规则与结构收敛,不改既有 schema、不删字段。

## Capabilities

### New Capabilities
- `methodology/object-realm-contract`: 对象层契约——目标仓必需文件与最小字段、meta 工具不得内嵌具体目标、`realm_structure` 确定性结构校验。

### Modified Capabilities
<!-- 无既有能力被修改 -->

## Impact

- 移动:`meta/evolution/retro/takeaway-round2*.yaml` → `targets/dsh/evolution/retro/`。
- 修改:`meta/engine/{gate_rules.py,orchestrator.yaml}`、`meta/scripts/check.py`、`meta/evolution/{bench.py,judge.py,retro/accept-example.yaml}`、相关 README。
- 新增:`/meta/templates/*.template.yaml`、`realm_structure` 规则、`realm-check` DAG 阶段。
- 复用:既有引擎/闸门注册/校验;不新增依赖、不依赖 OpenSpec/任何 harness。
