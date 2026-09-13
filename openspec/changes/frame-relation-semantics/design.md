## Context

两个目标(同源的 dsh 与异质的 plant-maint)实证了"关系词无语义"导致作者各自发明(dsh 冒出 5 个未声明词)或各自约定方向(plant-maint)。动机与逐条语义见 proposal。约束:add-only、meta-only、不引入硬门。

## Goals / Non-Goals

**Goals:**
- 让 8 个关系各带一句话语义 + subject→object 方向约定,可一致使用。
- 语义内容以两个目标的真实用法为最小依据,不臆造。

**Non-Goals:**
- 不新增/删除关系 id。
- **不引入硬门**:方向/naming 一致性仍走报告非门,留待更多样本。
- 不改任何目标产物、不改四份 schema、不动引擎与既有闸门语义。

## Decisions

1. **语义与方向逐条以两个目标的真实用法排定**(见 proposal 的 8 条)。它们来自 `DM-001..003`(plant-maint)与 dsh 的 `DM-001..003` 实际表达,而非空想。
2. **方向约定统一为 subject→object**:例如 `EquipmentUnit composes EquipmentPart` 意为"整体(subject)由部件(object)组成";`WorkOrder reads SpareInventory` 意为"工单读取库存"。
3. **字段为可选、语义不参与校验**:避免在有限样本上把语义定死为门;字段只携带契约信息,供作者一致参考。

## Risks / Trade-offs

- [语义可能覆盖不全] → 标注为"依据当前两目标的最小约定";`description`/`direction` 是可选字段,后续可追加。
- [有人把可选语义当成硬门] → design/tasks 明确:本 change 不动门;一致性只进报告。
- [逐条语义与既有某产物矛盾] → 以既有产物为准复核;冲突时记录而不是悄悄改产物。

## Migration Plan

1. 改 frame.yaml 的 8 个 relationType。2. 同步主规格并归档本 change。3. 跑 `check.py` + `bench.py` 两个目标:回归不退。4. 跑 `tracer.py report` 两目标:declared 列表不变。5. 回滚:单文件 + git。

## Open Questions

无(语义与方向已按两目标排定)。
