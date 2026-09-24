## 1. 契约与模板

- [x] 1.1 改 `/meta/templates/components.template.yaml`:`path` 标注为**可选**,语义写明「代码路径;非软件领域可用逻辑定位符或省略」;verify 模板 YAML 可解析。
- [x] 1.2 复核 `/meta/engine/gate_rules.py` 的 `realm_structure`:实测**它只读 `ref`,不读 `path`**,无需改闸门;`ref` 仍是唯一必填。

## 2. 回归

- [x] 2.1 跑 `check.py targets/plant-maint` 与 `targets/dsh`:均 0 失败。
- [x] 2.2 负向验证:给 plant-maint 临时加一条**无 `path`** 的 components 条目 → `realm_structure: pass`、engine exit 0;随即恢复。既有带 path 的条目不受影响。
- [x] 2.3 跑 `bench.py targets/dsh`:verify PASS。
