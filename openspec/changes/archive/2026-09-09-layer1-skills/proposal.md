## Why

让方法论从"有脊柱"前进到"有肌肉"(Layer 1 技能包)。Layer 0 已立起可追溯的语义与结构底座,但产出的引导仍是流程壳——需求、架构评估、领域建模这三件事还没有被固化成 agent 可执行、可复用、跨项目同构的显式能力。本 change 把三个核心能力写成带固定契约的技能包,强制与 Layer 0 对接,使不同项目、不同 agent、不同时间做同一件事产出同构。

## What Changes

- **新增三个方法论技能**(meta 层产物,存 `/meta/skills/<name>/SKILL.md`):
  - `requirement-understanding`(需求理解)
  - `architecture-assessment`(架构分析/评估/改进)
  - `domain-modeling`(业务/领域建模)
- **每个技能带固定契约**:`触发条件 / 输入Schema / 步骤 / 输出Schema / 质量门`。
- **强制与 Layer 0 对接**:先"查本体并对齐术语"(frame + 项目 instances)→ 按 metaschema 产出 → 用校验脚本(`check.py`)过质量门;output 分别遵循 requirement / arch-report+adr / domain-model 四份 schema。
- **安装到 agent 可加载位置**:方法论源在 `/meta/skills/`,副本安装到 `.agents/skills/<name>/SKILL.md`,使运行中 agent 能直接调用(双层原则:源在元层,harness 副本为消费端)。
- **BREAKING(软)**:此后"需求理解/架构评估/领域建模"的相关产物必须经由对应技能产出并过质量门,不再走无约束的松散 prompt。

## Capabilities

### New Capabilities
- `methodology/requirement-understanding`: 需求理解技能契约——把原始需求转成结构化需求集,每条带可解析 conceptRef 与可验证验收准则。
- `methodology/architecture-assessment`: 架构分析/评估/改进技能契约——把需求集 + 存量架构转成架构评估报告与 ADR,带质量属性映射、差距分析与演进建议。
- `methodology/domain-modeling`: 业务/领域建模技能契约——把需求 + 领域术语转成领域模型(实体/关系/不变量/限界上下文)。

### Modified Capabilities
<!-- 无既有能力被修改 -->

## Impact

- 新增:`/meta/skills/<name>/SKILL.md`(3 份);`/meta/skills/README.md`;副本 `.agents/skills/<name>/SKILL.md`(3 份)。
- 复用 Layer 0:`/meta/metaschema/*.schema.json`、/`meta/ontology/frame.yaml`、`/meta/scripts/check.py`、目标项目 `instances.yaml`(如 `/targets/dsh/`)。
- 不改元模型、不改 frame;纯新增技能能力,无新依赖。
