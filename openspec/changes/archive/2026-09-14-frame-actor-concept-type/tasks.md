## 1. 内容

- [x] 1.1 在 `/meta/ontology/frame.yaml` 的 `conceptTypes` 新增 `Actor`(含义:"执行或参与执行、受规则约束的人类/角色/组织主体";可选属性 `role`/`orgUnit`);verify YAML 可解析、前 8 类型不变。
- [x] 1.2 与 `ExecutionUnit` / `Rule` 的边界写进 frame 注释(Actor=谁,ExecutionUnit=做什么,Rule=必须);无重复语义。

## 2. 目标侧

- [x] 2.1 `/targets/plant-maint/ontology/instances.yaml` 的 `sp:maintenance-crew` 改为 `instantiateOf: Actor`(apply 时的语义判断:班组是"主体"而非"一次工作单元");引用它的 DM-002 / REP-001 conceptRef(id)不变;`mappingGaps` 第 2 条更新为"已解决"。

## 3. 回归

- [x] 3.1 跑 `check.py targets/plant-maint`:0 失败、20 实例全部解析(`Actor` 为合法类型)。
- [x] 3.2 跑 `bench.py targets/dsh` 与 `targets/plant-maint`:均 PASS。
