## Context

F 的 G3 暴露:角色/人员/主体类概念在 7 类型里无家可归。用户已决策:**新增 `Actor` 概念类型**(而非\"明确不作为概念\")。动机见 proposal;行为要求见 delta spec。约束:add-only、meta-only。

## Goals / Non-Goals

**Goals:**
- 让\"谁在做什么\"中的 **who**(角色/人员/组织)有**一等概念归属**,不再降级为字段。
- 与 `ExecutionUnit`(what)、`Rule`(must)形成互补,使概念模型能表达完整的事实陈述。

**Non-Goals:**
- 不把 `Actor` 变成必填;不要求任何既有目标必须用。
- 不新增校验逻辑。
- 不改四份 schema、不改引擎、不改技能正文。

## Decisions

1. **新增 `Actor` 作为第 9 个概念类型**(用户决策;在 G2 的 `Rule` 之后 add-only 追加,与前 8 类型不冲突)。
2. **典型语义**:人类/角色/组织性主体,执行或参与某 ExecutionUnit、受某 Rule 约束。
3. **可选属性**:`role` / `orgUnit`(可选,遵循 frame 属性可选纪律)。
4. **目标侧 re-type(apply 时,可选)**:`sp:maintenance-crew` → `Actor`;若保留为 ExecutionUnit(\"班组执行工单\")亦说得通,不强改——决策留给 apply 时按语义判断。

## Risks / Trade-offs

- [Actor 与 ExecutionUnit 边界] → 区分:个人/角色/组织(无论是否参与执行)= Actor;\"一次要执行的工作单元\"= ExecutionUnit。在 frame 注释点名。
- [re-type 引发引用链变化] → `sp:maintenance-crew` 的引用(DM-002/ADR-001 等)不变,只改 instantiateOf;跑 check 回归。

## Migration Plan

1. frame.yaml conceptTypes 追加 `Actor`(+可选属性)。2. 目标侧(可选)re-type。3. 同步主规格并归档。4. 跑 check/bench 回归。5. 回滚:单文件 + git。

## Open Questions

无。
