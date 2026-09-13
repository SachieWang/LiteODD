## Context

F 的 G4:组件薄索引的 `path` 假定代码路径,非软件领域无自然取值(plant-maint 硬填逻辑定位符)。主规格只要求 `ref`,不一致在模板把 path 写成必填。动机见 proposal;行为要求见 delta spec。约束:add-only、meta-only。

## Goals / Non-Goals

**Goals:**
- 让 `path` 成为**可选**,并明确其语义(代码路径;**非软件领域**用逻辑定位符或省略)。
- **`ref` 保持为唯一必填**,继续由 `realm_structure` 确定性校验。

**Non-Goals:**
- 不改 `ref` 必须解析到实例的既有语义。
- 不改 `instances.yaml` / `sources.yaml` 契约。
- 不改任何既有目标(已填的 path 不动)。

## Decisions

1. **`path` 改可选**:这是与「仅 `ref` 为必填」的主规格对齐,而非新语义;模板是当前唯一把 path 写成必填的地方。
2. **语义写明**:path = 代码路径或逻辑归属定位符;非软件领域可省略或给逻辑定位符。
3. **realm_structure 复核**:若它读取 `path` 并把它当必填,则在本 change 内放宽为可选;`ref` 校验不变。
4. **不动既有目标**:`targets/dsh` 与 `plant-maint` 已填的 path 保留,不强制改。

## Risks / Trade-offs

- [放宽 path 后丧失定位信息] → 可选不强制,愿意提供定位符的作者仍可填;`ref` 仍是绑定点。
- [realm_structure 依赖 path 做结构判定] → apply 时逐一核实;若只读 ref,则只改模板与主规格。

## Migration Plan

1. 改模板(path 可选 + 语义)。2. 复核/放宽 realm_structure(若需要)。3. 同步主规格并归档。4. 跑 check/bench 两目标回归。5. 回滚:单文件 + git。

## Open Questions

无(决策已定:path 可选、ref 唯一必填)。
