## 1. 内容

- [ ] 1.1 在 `/meta/ontology/frame.yaml` 为 8 个 `relationType` 增加 `description` 与 `direction`(语义与方向见 proposal 的 8 条);verify YAML 可解析、8 个 `id` 不变。
- [ ] 1.2 复核逐条语义与两个目标产物不矛盾;若冲突,记录在任务里、不改产物。

## 2. 回归

- [ ] 2.1 跑 `check.py targets/dsh` 与 `targets/plant-maint`:verify 均 0 失败。
- [ ] 2.2 跑 `bench.py targets/dsh`:verify PASS(新增可选字段不退基准)。
- [ ] 2.3 跑 `tracer.py report` 两目标:verify `declared` 仍为 8、无变化。
