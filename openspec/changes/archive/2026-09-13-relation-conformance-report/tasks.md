## 1. 指标实现

- [x] 1.1 在 `/meta/trace/tracer.py` 新增 `relation_conformance(target)`:以 `meta/ontology/frame.yaml` 的 `relationTypes[].id` 为 `declared`,扫描所有 `domainModel` 的 `relationships[].type` 为 `used`;返回 `declared / used / used_declared / undeclared / unused`(容忍 `relationTypes` 的 `- id: x` 与 `- x` 两种写法)。
- [x] 1.2 在 `report` 子命令追加输出段:声明类型的实际使用计数、**undeclared** 名单(并列出使用它的 artifact id)、**unused** 名单;verify `report` **恒返回 0**(非门语义由退出码观察)。

## 2. 验证

- [x] 2.1 对 `targets/dsh` 实跑 `tracer.py report targets/dsh`:实测暴露 **5 个** undeclared(`applies`/`consumes`/`hasScope`/`isA`/`uses`,横跨 DM-001..003;其中 DM-002 的 3 个关系类型**全部**未声明)、**4 个** declared-but-unused(`constrains`/`dependsOn`/`reads`/`usedBy`),声明类型使用计数 `4/8`,且**退出码为 0**。
- [x] 2.2 跑 `bench.py targets/dsh`:verify 退出码 `0`(`check.py` PASS + `engine` PASS),即 Layer 4 改动未使基准退化。
- [x] 2.3 硬门行为不变:跑 `tracer.py verify targets/dsh`,verify 仍 `PASS: link integrity OK`,未新增错误类型。
- [x] 2.4 越界确认:`git diff --stat` 仅包含 `meta/trace/tracer.py` + 本 change 目录 + 主规格;**未触碰** `frame.yaml`、`metaschema/*`、`gate_rules.py`、`orchestrator.yaml`、任何 `targets/` 产物。

## 3. 记录

- [x] 3.1 修正 change 材料中的缺口规模:手工排查只见 `consumes`(1 个),指标实测为 5 个;proposal 与 design 均按实测值更新,并记录"人工抽查看不见、指标可见"这一事实本身作为本 change 的理由。
