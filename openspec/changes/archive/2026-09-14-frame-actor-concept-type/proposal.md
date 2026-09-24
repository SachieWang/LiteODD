## Why

F 的 G3:简报 §四 的 5 类角色(设备工程师/巡检员/维修班组/备件库管/安全员/中控员)在 frame **没有对应概念类型**,只能降级为工单/规程上的字段;frame 7 类型里没有\"角色/人员/主体\"这一类。维修班组只能勉强映射为 `ExecutionUnit`。

## What Changes

- frame 新增**第 9 个概念类型 `Actor`**:一种人类/角色/组织性主体概念(执行或参与某 ExecutionUnit/Rule 的人或组织)。
- 典型语义:角色承载\"谁\"(`who`),执行单元承载\"做什么\"(`what`),规则承载\"必须\"(`must`)——把角色从字段提升为一等概念。
- **add-only**:只新增一个类型,不删不改既有 8 类型。
- 目标侧(apply 时):`targets/plant-maint` 的 `sp:maintenance-crew` 由 `ExecutionUnit` 改为 `Actor`(可选;若保留为 ExecutionUnit 亦不冲突)。

## Capabilities

### Modified Capabilities
- `methodology/ontology-frame`:新增 `Actor` 概念类型要求。

## Impact

- 修改:`/meta/ontology/frame.yaml`(conceptTypes 新增 `Actor`)。
- 目标侧(可选):`sp:maintenance-crew` re-type 为 `Actor`。
- **不动**:四份 schema、引擎、技能正文、既有类型与其它目标。
