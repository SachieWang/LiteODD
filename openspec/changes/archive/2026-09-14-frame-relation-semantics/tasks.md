## 1. 内容

- [x] 1.1 在 `/meta/ontology/frame.yaml` 为 8 个 `relationType` 增加 `description` 与 `direction`(语义与方向见 proposal 的 8 条);verify YAML 可解析、8 个 `id` 不变。
- [x] 1.2 复核逐条语义与两个目标产物不矛盾:8 条均与 dsh `DM-001..003`、plant-maint `DM-001..003` 的实际表达一致(如 `EquipmentLedger usedBy InspectionTask`、`MaintenanceProvider providedBy MaintenanceCrew` 在 subject→object 约定下成立);无冲突。

## 2. 回归

- [x] 2.1 跑 `check.py targets/dsh` 与 `targets/plant-maint`:均 0 失败。
- [x] 2.2 跑 `bench.py targets/dsh` 与 `targets/plant-maint`:均 `[bench] PASS`。
- [x] 2.3 跑 `tracer.py report` 两目标:declared 仍为 8(dsh `4/8`、plant-maint `8/8`),无变化。
