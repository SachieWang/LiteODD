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
| **可自进化** | 新陈代谢(演进治理) | 复盘→收敛裁判(记录+回归+add-only)→meta-only 吸收;add-only 演进 |
| **可把控** | 骨架(DAG 引擎 + 确定性门) | 流程 DAG、过门机器判定、审批三态 |
| **可追溯** | 神经系统(全局 Provenance) | 产物带 `conceptRef` → 实例 → 元类型;全局链接完整性校验 + 反向查询 |

设计原则:**奥卡姆剃刀 + K.I.S.S.** —— 一切能用「目录 + 纯文本 + git + 一个校验器」解决的,不引入数据库/推理机/图存储/工作流框架/OWL。

---

## 分层蓝图(五层已全部落地)

```
 Layer 0 本体/知识底座   ← 脊柱:frame 类型 + 元模型 schema + 单一校验器 + 对象层契约
 Layer 1 方法执行层      ← 肌肉:三个技能(需求理解/架构评估/领域建模),固定契约
 Layer 2 治理/编排层     ← 骨架:确定性 DAG 引擎 + 闸门注册表 + 审批三态 + 审计
 Layer 3 演进治理层      ← 新陈代谢:复盘 → 收敛裁判(记录+回归+add-only)→ meta-only 吸收
 Layer 4 可追溯层        ← 神经系统:全局链接完整性校验 + 覆盖度指标 + 反向查询
```

外挂**集成适配层**(不编入五层):`meta/integrations/` —— 单一网关 `gateway.py`(统一 JSON 信封)+ DSH Cordis 插件壳(模型工具 / 卡片 UI / 技能),把"手动敲脚本"降为"一次工具调用"。它**只搬运不裁决、不就地吸收、不改核心**。详见 [meta/integrations/README.md](meta/integrations/README.md) 与 [DSH 适配](meta/integrations/dsh/README.md)。

详见 [docs/architecture.md](docs/architecture.md)。

---

## 双层布局(元层 vs 对象层)

```
  /meta/                             /targets/<project>/
  方法论工具本身(通用、随方法演进)      目标项目产物(实践结果)
  ├─ ontology/frame.yaml          ├─ ontology/instances.yaml     项目本体实例   (必需)
  ├─ metaschema/*.schema.json     ├─ ontology/components.yaml    组件薄索引     (必需)
  ├─ templates/*.template.yaml    ├─ ontology/sources.yaml       来源注册表     (必需)
  ├─ skills/<skill>/SKILL.md      ├─ artifacts/                  需求/报告/ADR/领域模型
  ├─ engine/                      ├─ evolution/retro/            实践复盘记录
  ├─ evolution/                   └ 每份产物带 conceptRef / source
  ├─ trace/
  ├─ scripts/check.py
  └─ (方法论自身的 changes/归档在 openspec/)
```

三份对象层文件(instances / components / sources)由 **`object-realm-contract`** 规定为**必需**,并可用 `/meta/templates/*.template.yaml` 套用;缺失或结构不合法会被 DAG 首阶段 `realm-check` 拦下。

**连接机制(不引入额外系统):**

| 抓手 | 作用 |
|---|---|
| `instantiateOf` | 项目实例 → 元层 frame 类型(类型/实例分离) |
| `conceptRef` | 产物 → 项目实例(术语对齐 + 可追溯链) |
| `source` | 需求 → 可机器校验的来源(`file:<存在路径>` 或 `sources.yaml` 登记 id) |
| `meta.schemaVersion` | 元层版本化(追踪自身演进) |

**放置纪律**:方法产物只进 `/meta/`;项目产物只进 `/targets/<project>/`;严禁混放。**meta 层不内嵌任何具体目标**(工具不默认 `targets/<某项目>`,目标运行时显式提供)。`targets/` 作为实践产物默认被 git 忽略,待独立方法论工具仓分发时再做迁移。

---

## 已实现(当前成长阶段)

| 层 | 内容 | 现状 |
|---|---|---|
| **Layer 0 本体/知识底座** | frame(7 类型/8 关系)、4 份元模型 schema、`check.py` 单一校验器(uv+Python)、对象层契约 + 3 模板 | ✅ 已归档并入库 |
| **Layer 1 技能包** | 需求理解 / 架构评估 / 领域建模 三技能(`SKILL.md`,固定五段契约) | ✅ 已归档并入库 |
| **Layer 2 治理/编排** | 确定性 DAG 引擎(拓扑/闸门注册表/审批三态/审计/目标中性) | ✅ 已归档并入库 |
| **Layer 3 演进治理** | `meta/evolution/`:复盘模板 + 收敛裁判(`judge.py`)+ 基准回归(`bench.py`) | ✅ 已归档并入库 |
| **Layer 4 可追溯** | `meta/trace/tracer.py`:链接完整性 `verify` + 覆盖度 `report` + 反向查询 `refs/why` | ✅ 已归档并入库 |
| **外挂 集成适配层** | `meta/integrations/`:单一网关 `gateway.py`(统一 JSON 信封)+ DSH Cordis 插件壳(5 个模型工具 / 卡片面板 / 两个技能)+ 宿主契约自检 | ✅ 已入库(常驻 bundle 待后续) |

方法论本体(meta/ 全部)已入库;实践样例(instances/产物/复盘记录)存于忽略的 `targets/`,演示见教程的 eShop-demo 模拟案例。

---

## 快速上手

```bash
# 0. 环境(uv 管理,依赖见 meta/scripts/pyproject.toml + uv.lock)
#    若 ~/.cache 只读(如沙箱),另设:
#    export UV_CACHE_DIR=$PWD/.uv-cache UV_PYTHON_INSTALL_DIR=$PWD/.uv-python

# 1. Layer 0 合规校验(三段不变量 + conceptRef 解析);<target> 必填
uv run --project meta/scripts python meta/scripts/check.py <target>

# 2. Layer 2 受控流水线(realm-check → 需求 → 架构 → 建模 → trace-check)
#    --assume-approval:把 arch-assess 审批点的 human 视为已确认(非交互)
uv run --project meta/scripts python meta/engine/engine.py <target> --assume-approval
#    默认:到审批点 HOLD(人环暂停)
uv run --project meta/scripts python meta/engine/engine.py <target>

# 3. Layer 4 可追溯
uv run --project meta/scripts python meta/trace/tracer.py verify <target>    # 链接完整性(硬门)
uv run --project meta/scripts python meta/trace/tracer.py report <target>    # 覆盖度指标
uv run --project meta/scripts python meta/trace/tracer.py refs   <target> sp:<concept>   # 反向查询

# 4. Layer 3 自进化
uv run --project meta/scripts python meta/evolution/bench.py <target>        # 基准回归
uv run --project meta/scripts python meta/evolution/judge.py <candidate.yaml> --target <target>  # 收敛裁判

# 5. 集成适配层:一条命令跑完全链(回归 + 判定),stdout 是单一 JSON 信封
uv run --project meta/scripts python meta/integrations/gateway.py gate --target <target> [--candidate <candidate.yaml>]
```

接入 DSH(模型工具 + 卡片面板 + 技能)见 [meta/integrations/dsh/README.md](meta/integrations/dsh/README.md);
宿主契约自检:`node meta/integrations/dsh/tests/verify-adapter.mjs`。

详见 [教程](docs/tutorial.md) 与 [参考手册](docs/manual.md)。

---

## 文档索引

| 文档 | 内容 |
|---|---|
| [docs/architecture.md](docs/architecture.md) | 总体架构、五层蓝图、双层布局、确定性边界、add-only 演进 |
| [docs/tutorial.md](docs/tutorial.md) | 从零上手:新项目建模到受控流水线的完整演练(以脱敏 eShop-demo 为例) |
| [docs/manual.md](docs/manual.md) | 参考手册:元模型 schema、frame、三技能契约、引擎契约、可追溯与自进化、CLI、演进规范 |
| [meta/README.md](meta/README.md) | 元层总览与放置规则 |
| [meta/integrations/README.md](meta/integrations/README.md) / [DSH 适配](meta/integrations/dsh/README.md) | 集成适配层:单一网关 + 信封契约 + DSH Cordis 插件接线、装载、排障 |
| [meta/engine/README.md](meta/engine/README.md) / [meta/trace/README.md](meta/trace/README.md) / [meta/evolution/README.md](meta/evolution/README.md) / [meta/skills/README.md](meta/skills/README.md) | 各层工具的独立说明 |

---

## 如何演进(不破坏)

1. **加新闸门检查** = 在 `meta/engine/gate_rules.py` `register(...)` 一条,不改引擎。
2. **加自动审批** = 在 `meta/engine/approval_policies.py` 注册新提供者,不改 `human` 默认与三态语义。
3. **扩契约** = 加可选字段 / 加版本并存;**永不删、永不把可选变必填、语义变更开新版本共存**。
4. **本体实例化** = 新项目建 `/targets/<proj>/`,套用 `/meta/templates/` 写 `instances.yaml` + `components.yaml` + `sources.yaml`(三份必需),每实例标 `instantiateOf`。
5. 方法论自身迭代走 `openspec/` 的 change 流程(本仓库用 OpenSpec **自管自**,但方法本身不依赖 OpenSpec);**自进化的吸收必须先过收敛裁判**(记录为版本化 change + 基准回归 + add-only 兼容)。

## 版本库状态

- 提交基线:`37f4f79`(Layer 0/1)→ `ffb40c5`(Layer 2)→ `69768f3`(Layer 3)→ `950a4f4`(来源可校验 + 对象层契约)→ `6c45c15`(Layer 4);另有 docs 提交 `8481bab`。
- 归档 change:见 `openspec/changes/archive/`(methodology-layer0 / layer1-skills / layer2-harness / layer3-evolution / gate-provenance-resolvable / object-realm-contract / layer4-traceability)。
- 主规格:见 `openspec/specs/methodology/`(10 个能力)。
- 实践产物 `targets/` 不入库(待独立工具仓分发)。
