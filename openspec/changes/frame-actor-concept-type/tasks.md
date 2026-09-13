## 1. 内容

- [ ] 1.1 在 `/meta/ontology/frame.yaml` 的 `conceptTypes` 新增 `Actor`(附一行含义与可选属性 `role`/`orgUnit`);verify YAML 可解析、前 8 类型不变。
- [ ] 1.2 复核与 `ExecutionUnit` / `Rule` 的边界说明写入 frame 注释;verify 与前 8 类型无重复语义。

## 2. 目标侧(可选)

- [ ] 2.1 按 apply 时语义判断是否把 `targets/plant-maint` 的 `sp:maintenance-crew` 改为 `instantiateOf: Actor`;若保留 `ExecutionUnit` 记录理由。verify 引用 id 不变。

## 3. 回归

- [ ] 3.1 跑 `check.py targets/plant-maint`:verify 0 失败、`Actor` 是合法类型。
- [ ] 3.2 跑 `bench.py targets/dsh` 与 `targets/plant-maint`:verify 均 PASS。
