## 1. 内容

- [x] 1.1 在 `/meta/ontology/frame.yaml` 的 `conceptTypes` 新增 `Rule`(含义:"可版本化、约束其它概念的规则/规程/约束,区别于 PersistentState";可选属性 `version`/`effectiveFrom`/`appliesTo`);verify YAML 可解析、既有 7 类型不变。
- [x] 1.2 目标侧 `mappingGaps` 第 1 条更新为"已解决";delta 中补 Rule 与 PersistentState 的边界区分。

## 2. 目标侧 re-type

- [x] 2.1 `/targets/plant-maint/ontology/instances.yaml` 的 `sp:safety-procedure` 改为 `instantiateOf: Rule`;引用它的 REQ-005 / DM-003 / REP-001 / ADR-001 的 conceptRef(id)全部不变。

## 3. 回归

- [x] 3.1 跑 `check.py targets/plant-maint`:0 失败、20 实例全部解析(`Rule` 为合法类型)。
- [x] 3.2 跑 `bench.py targets/dsh` 与 `targets/plant-maint`:均 PASS。
