---
name: methodology-domain-modeling
description: 业务/领域建模技能——把需求 + 领域术语转成领域模型(实体/关系/不变量/限界上下文),输出遵循 domain-model.schema.json 并经校验脚本过质量门。当用户想用这套方法论对业务/领域有效建模、界定限界上下文时使用。
metadata:
  author: methodology-layer1
  version: "1.0"
  realm: meta
---

# 业务/领域建模技能 (Domain Modeling)

本技能把**需求 + 领域术语**转成**领域模型**,强制把实体对齐到 Layer 0 本体实例,保证模型可追溯、可表达、可测试。

> 前提:目标项目已有 `instances.yaml`;元层有 frame、`domain-model.schema.json` 与 `check.py`。领域建模是需求理解的下游,常配合事件风暴/统一语言。

## 触发条件 Trigger

- 需要对业务/领域建模,产出领域模型与限界上下文;或
- 已有需求集,需要把业务概念结构化(实体/关系/不变量);或
- 需要为后续开发建立领域术语的统一参照(呼应 frame 的 ContextBoundary)。

## 输入 Schema Input

- `requirements` : 需求集(带 `conceptRef`)与领域术语/统一语言。
- `project` : 目标项目,读取 `ontology/instances.yaml`。
- 可选:`invariantsSource`(约束/规则来源,如业务规则、验收准则)。

## 步骤 Steps

1. **先对齐本体**:读取 frame 与项目 instances,把领域术语映射到实例 `conceptRef`。
2. **概念抽取(DDD)**:从需求提炼 实体/值对象,用统一语言命名,不臆造未锚定的概念。
3. **对齐本体**:每个实体绑定可解析的 `conceptRef`。
4. **界定限界上下文**:用 ContextBoundary 语义划分 bounded context,并把实体归位。
5. **模型定稿**:补实体属性、实体间 relationships、显式 invariants(约束/不变量)。
6. **过质量门**:运行校验(见质量门)。

## 输出 Schema Output

- 一份 `domain-model`,遵循 `/meta/metaschema/domain-model.schema.json`:
  `{ domainModel: { id, entities[{name, conceptRef, attributes?}], boundedContexts[], relationships[], invariants[], conceptRef[], meta:{schemaVersion} } }`。
- 每个实体必须有 `conceptRef`(在项目 `instances.yaml` 内解析)。
- 输出含 `boundedContexts`、`relationships`、`invariants`,以支撑可追溯与可测试。

## 质量门 Quality Gate

- 运行 `uv run --project meta/scripts python meta/scripts/check.py <project>`:三段不变量 + 所有 `conceptRef` 解析。
- **语义抽查**:每个实体必须带可解析 `conceptRef`;模型必须含 boundedContexts 与 invariants,否则**不释放**。
- 未对齐本体的实体(无 conceptRef)先回本体对齐或标注待定,不静默放行。

> 方法库/反模式:实体无锚定→概念游离、不可追溯;无限界上下文→边界模糊、职责不清;缺不变量→模型无从测试/校验。
