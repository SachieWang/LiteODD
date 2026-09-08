## Why

Layer 1 把需求理解/架构评估/领域建模固化成技能,但仍是\"三块独立肌肉\"——流程走向与闸门决定仍靠 LLM/启发式,\"可把控\"只停留在产物结构校验。本 change 引入 **Layer 2 治理/编排层**:**确定性 DAG 引擎 + 确定性闸门 + 确定性审计**作为骨架,把三技能串成受控流水线;并从一开始就把\"可扩展、避免未来大规模破坏性变更\"内置成契约(add-only 演进、闸门注册表、稳定 Producer 接口)。

## What Changes

- **新增确定性编排器**(meta 层工具 `/meta/engine/`):声明式 DAG(`orchestrator.yaml`)+ 极薄确定性执行器(`engine.py`,拓扑排序、逐节点过门、halt-on-fail、审计轨迹)。
- **确定性闸门注册表**:每个检查做成 `rule-id → 确定性函数` 单向注册,引擎只做稳定遍历与判定;加新检查=注册一条,不动引擎。
- **稳定 Producer 接口**:节点= `{ input, producer, gate }`,LLM 技能仅是众多 producer 之一,换 harness/LLM 不侵入引擎。
- **add-only 演进策略**:DAG 契约/闸门规则/artifact schema 一律\"新增可选、永不删、永不把可选变必填、语义变更开新版本并存\",从机制上排除未来破坏性变更。
- **DAG schema 预留 forward-compat 可选字段**(声明不实现,保未来扩展不改 schema)。
- **冻结顶层层级布局**(`meta/`、`targets/<project>/`)与顶层 `.gitignore` 为契约。
- **审计输出** `run-<ts>.jsonl`(谁/何时/过门结果/进入了哪个产物),供 Layer 4 可追溯与 Layer 3 自进化。
- **BREAKING(软)**:此后目标项目的需求→架构→建模,建议经由本受控流水线产出并过确定性门,不再散跑。

## Capabilities

### New Capabilities
- `methodology/orchestration`: 确定性 DAG 编排契约——声明式 DAG、确定性执行、闸门注册表、Producer 接口、add-only 演进策略、审计输出;全部工具无关(不依赖 OpenSpec/任何 harness)。

### Modified Capabilities
<!-- 无既有能力被修改 -->

## Impact

- 新增:`/meta/engine/orchestrator.yaml`、`/meta/engine/engine.py`(及可选 `gate_rules.py` 注册表);`/meta/engine/README.md`。
- 复用:Layer 0 `check.py`(作闸门库)、`frame.yaml`、`metaschema/*`;目标项目 `instances.yaml`/`artifacts`。
- 不新增框架依赖(仅 PyYAML + jsonschema + 手写拓扑排序);不依赖 OpenSpec CLI。
- 不改 frame/元模型/技能契约;纯新增治理编排能力。
