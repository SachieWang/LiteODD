## 1. 内容

- [ ] 1.1 在 `/meta/ontology/frame.yaml` 的 `conceptTypes` 新增 `Rule`(附一行含义与可选属性 `version`/`effectiveFrom`/`appliesTo`);verify YAML 可解析、既有 7 类型不变。
- [ ] 1.2 更新 `sp:mappingGaps`/README 中对规程类概念的处理说明(不再\"勉强塞 PersistentState\")。

## 2. 目标侧 re-type

- [ ] 2.1 把 `/targets/plant-maint/ontology/instances.yaml` 的 `sp:safety-procedure` 改为 `instantiateOf: Rule`,并更新其 `mappingGaps` 记录;verify 引用它概念Ref(id)不变。

## 3. 回归

- [ ] 3.1 跑 `check.py targets/plant-maint`:verify 0 失败、`all N instance(s) resolve to a frame type` 且 `Rule` 是合法类型。
- [ ] 3.2 跑 `bench.py targets/dsh` 与 `targets/plant-maint`:verify 均 PASS。
