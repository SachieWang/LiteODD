## 1. 实现

- [x] 1.1 在 `/meta/engine/gate_rules.py` 新增 `_read_yaml(path)` 受保护读取:捕获 `yaml.YAMLError`(Scanner/Parser)与 `OSError`,返回 `(None, error)`,error 含 **文件 / 行 / 原因**;`load_target_context`、`load_sources`、`_frame_types`、`realm_structure` 三处统一改走它。verify 合法内容解析行为不变。
- [x] 1.2 `provenance_resolvable` 把 sources 解析错误并入该规则 errors;`engine.py` 对 `instances.yaml` 解析失败打 `[HALT]` + 错误明细并 `return 1`(不再 uncaught)。

## 2. 验证

- [x] 2.1 **负向**:临时把 `targets/plant-maint/ontology/sources.yaml` 写成非法(裸 `": "`);跑 `engine.py` 实测输出:
      `文件: targets/plant-maint/ontology/sources.yaml | 行: 7 | 原因: mapping values are not allowed here`,
      `[HALT] stage realm-check FAILED gates: ['realm_structure']`,**无 uncaught traceback**,exit **1**;随即恢复,engine 恢复 exit 0。
- [x] 2.2 **正向回归**:`check.py` 对 `targets/dsh`、`plant-maint` 均 PASS;`bench.py` 两目标均 `[bench] PASS`。
- [x] 2.3 `check.py` 职责未动(只校验 artifacts);改动仅 `gate_rules.py`(读取保护 + 调用点)与 `engine.py`(上下文构建的错误出口)。
