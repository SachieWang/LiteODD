## Context

F 的 G2 暴露:规则/规程/约束类概念在 7 类型里无家可归,只能降级为 `PersistentState`,丢失约束语义。用户已决策:**新增 `Rule` 概念类型**(而非\"明确不作为概念\")。动机见 proposal;行为要求见 delta spec。约束:add-only、meta-only。

## Goals / Non-Goals

**Goals:**
- 让\"可版本化、约束其它概念\"的规则/规程有**一等概念归属**(`Rule`)。
- 经 `constrains` 关系自然表达\"规程约束工单\"这种语义,与 G1 的关系语义一致。

**Non-Goals:**
- 不把 `Rule` 变成必填类型;不要求任何既有目标必须用。
- 不新增校验逻辑(类型存在由 `instantiateOf` 解析校验自动覆盖)。
- 不改四份 schema、不改引擎、不改技能正文。

## Decisions

1. **新增 `Rule` 作为第 8 个概念类型**(用户决策)。纳入 frame 的 conceptTypes 列表。
2. **典型语义**:可版本化、约束其它概念;经 `constrains` 表达\"约束\"关系(呼应 G1 的关系语义)。
3. **可选属性**:`version` / `effectiveFrom` / `appliesTo`——遵循 frame \"属性可选、不强制\"的既有纪律(见 ontology-frame 的 Lightweight per-type attributes)。
4. **目标侧 re-type**(apply 时):`sp:safety-procedure` 从 `PersistentState` → `Rule`;这是对象层产物,允许修改,且是 F 之后的正规跟进。

## Risks / Trade-offs

- [Rule 与 PersistentState 边界模糊] → 语义上区分:Rule = 可执行的约束/规程;PersistentState = 被读写的数据/状态。在 frame 注释点名。
- [目标侧 re-type 引发 conceptRef 链变化] → `sp:safety-procedure` 的引用(REQ-005/DM-003/ADR-001)不变,只改 instantiateOf;跑 check 回归确认。

## Migration Plan

1. frame.yaml conceptTypes 新增 `Rule`(+可选属性)。2. 目标侧 re-type `sp:safety-procedure`。3. 同步主规格并归档。4. 跑 check/bench 两目标回归。5. 回滚:单文件 + git。

## Open Questions

无。
