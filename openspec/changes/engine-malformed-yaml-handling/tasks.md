## 1. 实现

- [ ] 1.1 在 `/meta/engine/gate_rules.py` 新增受保护的对象层 YAML 读取:捕获 `yaml.YAMLError`(Scanner/Parser)与读取异常,返回**文件 + 行 + 原因**;各闸门把该文件记为 gate FAIL。
- [ ] 1.2 统一替换 `instances` / `components` / `sources` 三文件的读取调用(含 `realm_structure`、`provenance_resolvable` 等读 YAML 之处);verify 合法内容解析行为不变。

## 2. 验证

- [ ] 2.1 **负向**:临时把 `targets/plant-maint/ontology/sources.yaml` 写成非法(裸 `": "`);跑 `engine.py` → verify 输出**可读 FAIL 且点名文件+行+原因**,且**无 uncaught traceback**,exit 1;随即恢复。
- [ ] 2.2 **正向回归**:`check.py` 与 `bench.py` 对 `targets/dsh`、`plant-maint` 均 PASS。
- [ ] 2.3 复核 `check.py` 对 artifacts 的职责不变(它只管 artifacts,不背对象层 YAML 的锅)。
