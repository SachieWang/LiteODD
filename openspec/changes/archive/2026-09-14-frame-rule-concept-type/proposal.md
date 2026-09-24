## Why

F 的 G2:检修安全规程(REQ-005 的核心,简报 §二.5「规程落不了地」)在 frame 里**没有对应概念类型**,只能勉强塞进 `PersistentState`——丢失了\"它约束其它执行单元\"的语义。frame 现有 7 个概念类型(Assembly/Component/Seam/ExecutionUnit/PersistentState/EventStream/ContextBoundary),**没有\"规则/约束/规程\"这一类**。

## What Changes

- frame 新增**第 8 个概念类型 `Rule`**:一种**可版本化、约束其它概念**的概念;典型语义是\"约束\"——经 `constrains` 关系约束执行单元(如检修安全规程约束维修工单)。
- 典型属性:`version` / `effectiveFrom` / `appliesTo`(可选,不强制)。
- **add-only**:只新增一个类型,不删不改既有 7 类型。
- 目标侧(apply 时):`targets/plant-maint` 的 `sp:safety-procedure` 由 `PersistentState` **改为 `Rule`**(目标侧产物可改,属 F 之后的跟进)。

## Capabilities

### Modified Capabilities
- `methodology/ontology-frame`:新增 `Rule` 概念类型要求。

## Impact

- 修改:`/meta/ontology/frame.yaml`(conceptTypes 新增 `Rule`;可在类型上给可选属性)。
- 目标侧:`targets/plant-maint/ontology/instances.yaml` 的 `sp:safety-procedure` 改 `instantiateOf: Rule`(对象层,可改)。
- **不动**:四份 schema、引擎、技能正文、既有 7 类型与其它目标。
