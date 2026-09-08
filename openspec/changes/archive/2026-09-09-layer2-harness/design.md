## Context

Layer 0(脊柱/元模型/校验)与 Layer 1(三技能)已归档并提交。Layer 2 要把三技能串成受控流水线。动机见 proposal.md;行为契约(确定性编排/闸门注册/Producer 接口/add-only 演进/审计/解耦)见 specs。

约束:奥卡姆 + K.I.S.S.;与 OpenSpec 解耦(OpenSpec 仅是当前自管自的环境选择,非引擎必需);沿用 uv+Python。本设计的**核心诉求**是"可扩展、避免未来大规模破坏性变更",故把演进策略当作一等设计对象。

## Goals / Non-Goals

**Goals:**
- 确定性 DAG 引擎(拓扑执行、逐节点确定性闸门、halt-on-fail、审计轨迹)。
- 闸门注册表、稳定 Producer 接口、add-only 演进策略、forward-compat DAG 字段、冻结顶层层级——五点防断裂调整全部内置。
- 与 frame/元模型/技能**解耦**:引擎只消费 `/meta` 与 `targets/<project>/{instances,artifacts}`,不依赖 OpenSpec CLI/任何 harness。

**Non-Goals:**
- 不做分布式/调度器/远程执行(单机离线 pipeline 用不上;未来需要时再演进,仍受 add-only 约束)。
- 不实现 forward-compat 字段的语义(只声明,防未来改 schema)。
- 不推翻 Layer 0/1;不新增重型框架或 OWL 推理机。

## Decisions

1. **编排器选型 C:极薄自研确定性引擎**(而非 Airflow/Prefect/Temporal 或 Snakemake)。理由:pipeline 小、单机、离线、文件即产物;只依赖 PyYAML+jsonschema(Layer 0 已有)+ 手写拓扑排序(Kahn,~20 行,不引 networkx)。框架选型可换,但 **DAG 声明 + 闸门语义是稳定契约**——这是防未来破坏的第一层隔离。
   - 备选:分布式工作流框架 → 对单机 pipeline 是轰大炮,砍;Snakemake → 可选演进路径,不引入现在。
2. **闸门注册表(单向 rule-id → 函数)**:引擎核心只做"遍历注册规则→判定→halt",加检查=注册一条,不动引擎。既有的 `check.py`(schema/conceptRef/schemaVersion)作为**首个注册规则**,未来一致性规则(环检测/关系类型合法/覆盖)增量加入。关键:把 `check.py` 重构为可 import 的**闸门库**,引擎调用它而非反引 shell。
3. **稳定 Producer 接口 `{ input, producer, gate }`**:节点只声明输入/产物体与要过的闸门;生产者是**可换实现**(LLM 技能或确定性转换)。LLM 技能成为众多 producer 之一,换 harness/LLM 不触引擎与闸门。
4. **add-only 演进策略(本设计的核心纪律)**:
   - 新增一律走"加可选字段/加注册项/加类型",**永不删、永不把可选变必填、永不静默改语义**;
   - 语义变更 → 开**新版本并存**,旧版保留可引退,不覆盖;
   - 废弃 → `deprecated: true` + 提示 + 并存,到主版本才移除;
   - 各契约(`orchestrator.yaml` DAG 版本 / gate 规则集 / artifact `schemaVersion`)都带上版本号,沿用 Layer 0 的 add-only 作风。
   - 这条策略把"未来的每次扩展"从**破坏**变成**增量**,是避免大规模破坏性变更的关键机制。
5. **forward-compat DAG 字段**:DAG schema 声明 `retry/parallel/on_fail` 为可选(不实现语义),将来只加语法、不改 schema,旧配置依旧合法。
6. **冻结顶层层级**:`meta/`、`targets/<project>/` 与顶层 `.gitignore` 作为稳定契约,不随迭代变动(实践产物 migration 是独立决策,不改变该布局)。
7. **审计 = 确定性记录**:`run-<ts>.jsonl` 记 谁/何时/每节点闸门结果/进出的产物集,供 Layer 4 可追溯与 Layer 3 自进化。
8. **审批 = 可插拔/版本化的审批策略提供者(approval-policy provider)**:审批与闸门严格区分(闸门是确定性机器裁决;审批是\"放行策略\")。提供者返回 `approve / reject / hold` 三态,引擎只按三态执行:
   - **默认提供者 = human(人环暂停)**:声明审批点的节点暂停,等显式人工确认才放行——契合当前低自动化、求可控的诉求。
   - **将来提供者 = policy(阈值/规则自动审批)**:作为**新增注册项**加入审批策略注册表,`approve/reject/hold` 判定由阈值规则计算;不影响 human 默认、不改引擎判定语义(三态不变)。
   - 由 add-only 纪律保证:提高自动化率是**加一个提供者**,而非改引擎/改默认——兼容性 + 可扩展性一次满足。
9. **MVP 范围:需求→架构→建模三段全链**:领域建模是体系的基础核心阶段,不进 MVP 会削弱模型根基;三者同由本引擎驱动,共享同一脊柱与同一闸门纪律。

## 执行模型(engine.py 主循环)

```
读 orchestrator.yaml → 拓扑排序(Kahn)
按序处理每节点:
  1) Producer(可换):产出该节点声明 schema 的产物文件
  2) Gate(确定性):遍历注册表规则(check.py 系 + 增量一致性),
     任一失败 → 节点 failed、halt 下游
  3) Approval:若声明 human_required → 暂停等显式确认
  4) Audit:追加 run-<ts>.jsonl
产出:确定性执行 + 确定性闸门裁决 + 确定性审计轨迹
```

确定性边界:**DAG/拓扑/过门/放行顺序/审计 = 代码判定;LLM 只在 Producer 内生产内容与语义初判,不裁决、不掌控流程。** 过不过门以闸门为准,不以 LLM 自评为准。

## Risks / Trade-offs

- [自研引擎需维护少量代码] → 引擎刻意极薄;进化由 add-only 契约约束,不堆塞机制。
- [check.py 从 CLI 重构为库有回归风险] → 保留 CLI 入口兼容(仍可 `uv run check.py`),重构为可 import 模块并回归测试。
- [forward-compat 字段被误释为已实现] → 文档标注"声明未实现";spec 明确其语义未启用。
- [生产者多样但契约未定型] → 先用三技能 + 确定性转换两类;Producer 接口先窄后宽(仍是 add-only)。
- [add-only 策略与"想删掉坏设计"冲突] → 删除/重做走新版本并存 + 主版本引退,不静默覆盖;保证不破坏既有消费方。

## Migration Plan

1. 目录:`/meta/engine/{orchestrator.yaml, engine.py, gate_rules.py, README.md}`。2. 将 `check.py` 重构为可 import 闸门库,保留 CLI 兼容。3. 示例:`targets/dsh` 跑首条受控流水线(需求→架构→建模)。4. 回滚:纯文本 + git,删除即可。

## Resolved Decisions (自讨论定稿)

- **MVP 串全链**:需求→架构→建模三段全串;领域建模作为基础核心阶段纳入 MVP。
- **审批默认 = human(人环暂停)**,并通过 **approval-policy provider 抽象**支持将来加 `policy`(阈值自动)提供者——由 add-only 保证"提高自动化率=加提供者,不改引擎/默认/判定语义"。两待定项已消解,不再作为 Open Question。
