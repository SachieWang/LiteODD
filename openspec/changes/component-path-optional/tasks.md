## 1. 契约与模板

- [ ] 1.1 改 `/meta/templates/components.template.yaml`:把 `path` 标注为**可选**,并写明语义「代码路径;非软件领域可用逻辑定位符或省略」;verify 模板 YAML 可解析。
- [ ] 1.2 复核 `/meta/engine/gate_rules.py` 的 `realm_structure`:若它把 `path` 当必填,放宽为可选;verify `ref` 仍为唯一必填、仍解析到实例。

## 2. 回归

- [ ] 2.1 跑 `check.py targets/plant-maint` 与 `targets/dsh`:verify 均 0 失败。
- [ ] 2.2 负向验证(apply 时做):构造一个**无 `path`** 的 components 条目,verify `realm_structure` 仍通过(`ref` 解析即可);随即恢复。
- [ ] 2.3 跑 `bench.py targets/dsh`:verify PASS。
