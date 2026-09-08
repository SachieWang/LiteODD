# 本体驱动设计方法论工具体系 (Ontology-Driven Design System Toolkit)

一套**通用、可复用、可自进化、可把控、可追溯**的研发方法论工具体系:用**领域本体当脊柱**,把「需求理解 → 架构评估 → 领域建模」三件事钉在同一套可追溯的语义参照系上,并用**确定性引擎编排与门控**,让流程可控、产物可校验,而不是靠 LLM 赌运。

面向研发(存量系统分析建模、新需求分析建模维护、开发任务),且**不绑定任何特定工具或 harness**(OpenSpec 只是当前仓库自管自的环境选择;引擎与技能对 dsh 等任意 harness 通用)。

> **文档示例说明**:仓库的实践样例存于被 git 忽略的 `targets/` 目录(实践产物不入版本库)。本文与教程、手册一律用**脱敏的虚构案例 eShop-demo(电商订单服务)**讲述,便于在无样例环境下从零复现。

---

## 核心思想(一句话)

> **LLM 提议 · 引擎裁决。** LLM(技能)负责「生产内容」,确定性引擎与校验规则负责「流程编排、过门放行、审计留痕」。流程与门不交给 LLM 临场决定。

四个目标词 ≠ 并列特性,分别对应工具箱的四个部件:

| 目标 | 对应部件 | 机制 |
|---|---|---|
| **可复用** | 肌肉(技能包)+ 元层通用类型 | 类型在元层、技能跨项目通用 |
| **可自进化** | 新陈代谢(演进治理) | 复盘→沉淀→评估→版本化;add-only 演进 |
| **可把控** | 骨架(DAG 引擎 + 确定性门) | 流程 DAG、过门机器判定、审批三态 |
| **可追溯** | 神经系统(Provenance) | 产物带 `conceptRef` → 实例 → 元类型,全链可查 |

设计原则:**奥卡姆剃刀 + K.I.S.S.** —— 一切能用「目录 + 纯文本 + git + 一个校验器」解决的,不引入数据库/推理机/图存储/工作流框架/OWL。

---

## 分层蓝图(概览)

```
 Layer 0 本体/知识底座   ← 脊柱:frame 类型 + 元模型 schema + 单一校验器
 Layer 1 方法执行层      ← 肌肉:三个技能(需求理解/架构评估/领域建模),固定契约
 Layer 2 治理/编排层     ← 骨架:确定性 DAG 引擎 + 闸门注册表 + 审批三态 + 审计
 Layer 3 演进治理层      ← 新陈代谢(规划中):复盘→沉淀→评估→版本化
 Layer 4 可追溯层        ← 神经系统:产物带 conceptRef 到本体的链
```

详见 [docs/architecture.md](docs/architecture.md)。

---

## 双层布局(元层 vs 对象层)

```
  /meta/                             /targets/<project>/
  方法论工具本身(通用、随方法演进)      目标项目产物(实践结果)
  ├─ ontology/frame.yaml          ├─ ontology/instances.yaml     项目本体实例
  ├─ metaschema/*.schema.json     ├─ ontology/components.yaml    组件薄索引
  ├─ skills/<skill>/SKILL.md      └─ artifacts/                  需求/报告/ADR/领域模型
  ├─ engine/                      　　　└ 每份产物带 conceptRef
  ├─ scripts/check.py
  └─ (方法论自身的 changes/归档在 openspec/)
```

**连接只用三个抓手(不引入额外系统):**

| 抓手 | 作用 |
|---|---|
| `instantiateOf` | 项目实例 → 元层 frame 类型(类型/实例分离) |
| `conceptRef` | 产物 → 项目实例(术语对齐 + 可追溯链) |
| `meta.schemaVersion` | 元层版本化(追踪自身演进) |

**放置纪律**:方法产物只进 `/meta/`;项目产物只进 `/targets/<project>/`;严禁混放。`targets/` 作为实践产物默认被 git 忽略,待独立方法论工具仓分发时再做迁移。

---

## 已实现(当前成长阶段)

| 层 | 内容 | 现状 |
|---|---|---|
| **Layer 0 本体/知识底座** | frame(7 类型/8 关系)、4 份元模型 schema、`check.py` 单一校验器(uv+Python) | ✅ 已归档并入库 |
| **Layer 1 技能包** | 需求理解 / 架构评估 / 领域建模 三技能(`SKILL.md`,固定五段契约) | ✅ 已归档并入库 |
| **Layer 2 治理/编排** | 确定性 DAG 引擎(拓扑/闸门注册表/审批三态/审计) | ✅ 已归档并入库 |
| **Layer 3 演进治理** | 复盘→沉淀→评估→版本化(规划中) | ⏳ 未建 |
| **Layer 4 可追溯** | 产物 Provenance(`conceptRef` 链) | ✅ 由 Layer 0 支撑 |

方法论本体(meta/skills/specs/引擎)已入库;实践样例(instances/产物)存于忽略的 `targets/`,演示见教程的 eShop-demo 模拟案例。

---

## 快速上手

```bash
# 0. 环境(uv 管理,依赖见 meta/scripts/pyproject.toml + uv.lock)
#    若 ~/.cache 只读(如沙箱),另设:
#    export UV_CACHE_DIR=$PWD/.uv-cache UV_PYTHON_INSTALL_DIR=$PWD/.uv-python

# 1. Layer 0 合规校验(三段不变量 + conceptRef 解析);<target> 换成你的目标项目
uv run --project meta/scripts python meta/scripts/check.py <target>

# 2. Layer 2 受控流水线(全链,arch-assess 审批点以 --assume-approval 放行)
uv run --project meta/scripts python meta/engine/engine.py <target> --assume-approval

# 3. 默认审批(人环暂停演示:到审批点 HOLD)
uv run --project meta/scripts python meta/engine/engine.py <target>
```

详见 [教程](docs/tutorial.md) 与 [参考手册](docs/manual.md)。

---

## 文档索引

| 文档 | 内容 |
|---|---|
| [docs/architecture.md](docs/architecture.md) | 总体架构、双层布局、确定性边界、add-only 演进 |
| [docs/tutorial.md](docs/tutorial.md) | 从零上手:新项目建模到受控流水线的完整演练(以脱敏 eShop-demo 为例) |
| [docs/manual.md](docs/manual.md) | 参考手册:元模型 schema、frame、三技能契约、引擎契约、演进规范 |

---

## 如何演进(不破坏)

1. **加新闸门检查** = 在 `meta/engine/gate_rules.py` `register(...)` 一条,不改引擎。
2. **加自动审批** = 在 `meta/engine/approval_policies.py` 注册新提供者,不改 `human` 默认与三态语义。
3. **扩契约** = 加可选字段 / 加版本并存;**永不删、永不把可选变必填、语义变更开新版本共存**。
4. **本体实例化** = 新项目建 `/targets/<proj>/`,写 `instances.yaml`,每实例标 `instantiateOf`。
5. 方法论自身迭代走 `openspec/` 的 change 流程(本仓库用 OpenSpec **自管自**,但方法本身不依赖 OpenSpec)。

## 版本库状态

- 提交基线:`37f4f79`(Layer 0/1)+ `ffb40c5`(Layer 2)。
- 归档 change:见 `openspec/changes/archive/`(methodology-layer0 / layer1-skills / layer2-harness)。
- 主规格:见 `openspec/specs/methodology/`(7 个能力)。
- 实践产物 `targets/` 不入库(待独立工具仓分发)。
