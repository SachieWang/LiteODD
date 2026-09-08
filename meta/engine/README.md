# /meta/engine — 方法论 Layer 2 确定性编排器(元层产物)

本目录是**治理/编排层**的实现:一个**极薄、确定性**的 DAG 引擎,把三技能(需求理解→架构评估→领域建模)串成受控流水线。属 meta 层,通用、与 OpenSpec/任何 harness **解耦**。

## 组成

| 文件 | 职责 |
|---|---|
| `orchestrator.yaml` | 声明式 DAG 契约(三段全链 + 每阶段 deps/artifacts/gate/approval + forward-compat 字段) |
| `engine.py` | 确定性执行器(拓扑排序→逐节点过门→审批三态→halt 下游→审计) |
| `gate_rules.py` | 确定性闸门注册表(`rule-id → 函数`,单向注册、add-only) |
| `approval_policies.py` | 审批策略提供者(默认 `human` 人环暂停;`policy` 阈值自动为加性示例) |

## 确定性边界(核心纪律)

```
  DAG / 拓扑 / 过门 / 放行顺序 / 审计   → 全确定性,代码判定
  LLM 只做:Producer 内"生产内容与语义初判" → 提议,不裁决、不掌控流程
  过不过门以闸门(run_rules)为准,不以 LLM 自评为准
```

## 解耦(不依赖 OpenSpec / 任何 harness)

- 只消费 `/meta`(frame/metaschema/check.py 闸门库)与本仓 `targets/<project>/{instances,artifacts}`。
- **不调用 openspec CLI**,不要求在某个 agent harness 内运行。
- OpenSpec 仅是当前仓库自管自的环境选择,引擎本身工具无关。

## 用法

```bash
# 全链跑通(把 human 审批视为已确认,非交互验证)
uv run --project meta/scripts python meta/engine/engine.py targets/dsh --assume-approval
# 默认:arch-assess 审批点 HOLD,等显式人工确认(人环暂停)
uv run --project meta/scripts python meta/engine/engine.py targets/dsh
# 审计
cat targets/dsh/.audit/run-*.jsonl
```

## add-only 演进策略(防未来破坏性变更)

- 加新闸门检查 = 在 `gate_rules.py` `register(...)` 一条,不改引擎。
- 加自动审批 = 在 `approval_policies.py` 注册新 provider,不改 `human` 默认、不改三态语义。
- 扩契约 = 加可选字段/加版本并存;**永不删、永不把可选变必填、语义变更开新版本共存**。
- forward-compat 字段(`retry/parallel/on_fail`)已声明可选、语义未启用——将来只加语法、不改 schema。
- 顶层布局(`meta/`、`targets/<project>/`)视为稳定契约,不随迭代变动。
