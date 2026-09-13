# 架构说明书(Architecture)

本文描述本工具体系的总体架构:分层蓝图、双层布局、确定性边界,以及保证"可扩展、不破坏"的 add-only 演进策略。

## 一、分层蓝图

```
                +------------------  ③  演进治理层(自进化)  ----------------+
                |  复盘 → 沉淀 → 收敛裁判(记录+回归+add-only)→ 版本化吸收   |
                +----------------------------------------------------------+
                              ^  喂进来(实践产物/审计)  |  沉淀(实践→方法论)
                              |                        v
+----------------+   +----------------+   +--------------------------------+
|  ② 治理/编排层  |   |  ① 方法执行层   |   |  0  本体/知识底座               |
|  DAG引擎+确定性门|   |  技能包 Skills  |   |  frame类型 + 元模型schema + 校验 |
|  审批/审计/门控  |-->|  需求/架构/建模  |-->|  + 对象层契约 + 模板(脊柱/参照系)|
+----------------+   +----------------+   +--------------------------------+
      |                                        ^
      |  Audit/审计 + 全局链接                 |  定义所有 artifact 语义
      v                                        |
+--------------------------------------------------------------+
|  ④  可追溯层: 全局链接完整性校验 + 覆盖度指标 + 反向查询         |
+--------------------------------------------------------------+
                      v
           目标项目工作区 targets/<project>/(实例与产物)
```

| 层 | 职责 | 本仓库实现 |
|---|---|---|
| **0 本体/知识底座** | 语义脊柱 + 结构约束 + 对象层契约 | `meta/ontology/frame.yaml`(7 类型/8 关系)、`meta/metaschema/*.schema.json`(4 份)、`meta/scripts/check.py`、`meta/templates/*.template.yaml` |
| **1 方法执行层** | 把方法固化成 agent 可执行程序 | `meta/skills/`(需求理解 / 架构评估 / 领域建模) |
| **2 治理/编排层** | 把可把控做实:编排 + 门控 + 审批 + 审计 | `meta/engine/`(DAG 引擎 + 闸门注册表 + 审批三态 + 目标中性) |
| **3 演进治理层** | 自进化:复盘→收敛裁判→版本化吸收 | `meta/evolution/`(`retro.md` + `judge.py` + `bench.py`) |
| **4 可追溯层** | 全局 provenance:完整性 + 覆盖度 + 反向查询 | `meta/trace/tracer.py`(`verify`/`report`/`refs`/`why`) |

### 外挂:集成适配层(不属于五层)

五层定义"方法论是什么";`meta/integrations/` 只回答"**如何把它接进具体 agent 工具并把人工触发降到最低**",不改变任何一层契约。

```
  LLM/skill 提议  ─►  适配壳(DSH 插件 / MCP / CI)  ─►  gateway.py  ─►  core: check.py / bench.py / judge.py
     (概率区)              (传输层,零规则)             (唯一入口)            (确定性裁决,exit code 为准)
                                                          │
                                                          ▼
                                                吸收 = 发起一条方法论 change(版本化 + 三态审批)
```

三条红线:① **不复制裁决语义**(网关只取 core 的 exit code,把 judge 的条件行原样结构化);② **不就地吸收**(本层不写 meta、不碰 `targets/`);③ **不改核心契约**(harness 换代只改本层)。输出契约:`meta/integrations/schemas/verdict.schema.json`。

## 二、双层布局(元层 vs 对象层)

这是本体系区别于"单一仓库塞所有东西"的关键:`meta/` 是**规则(尺)**,`targets/<proj>/` 是**工件(量出的结果)**——尺和工件不混放,否则工具的通用性会被某个项目的细节污染,或项目的追溯链被工具的自我改造弄断。

```
/meta                            /targets/<project>/
├─ ontology/frame.yaml   类型(通用)├─ ontology/instances.yaml   实例(项目专属,必需)
├─ metaschema/*.json     artifact 结构规约
├─ templates/*.yaml      对象层模板  ├─ ontology/components.yaml 组件薄索引(必需)
├─ skills/<skill>/       方法(可执行)├─ ontology/sources.yaml     来源注册表(必需)
├─ engine/               治理骨架
├─ evolution/            自进化      ├─ artifacts/  需求/报告/ADR/领域模型(带 conceptRef)
├─ trace/                可追溯      ├─ evolution/retro/  实践复盘记录
└─ scripts/check.py      校验器      └─ .audit/      引擎审计轨迹
```

**对象层契约**:三份 `ontology/*.yaml` 为**必需**(由 `object-realm-contract` 规定、DAG 首阶段 `realm-check` 校验),可用 `/meta/templates/` 套用。

**连接两层的机制(不引入额外系统):**
1. `instantiateOf` —— 实例引用元层的**类型**(脱敏示例:`es:payment-gateway → frame#Seam`)。类型在元层,实例在对象层。
2. `conceptRef` —— 产物引用对象层的**实例**(示例:`REQ-001 → es:payment-gateway`),是术语对齐与可追溯的物理载体。
3. `source` —— 需求引用**可机器校验的来源**(`file:<存在路径>` 或 `sources.yaml` 登记 id),杜绝伪溯源。
4. `meta.schemaVersion` —— 元层版本化,追踪方法论自身演进。

**放置纪律**:方法产物只进 `meta/`;项目产物只进 `targets/<proj>/`。**meta 层不内嵌任何具体目标**(工具不默认 `targets/<某项目>`,目标运行时提供)。`targets/` 作为实践产物默认不入版本库,待独立方法论工具仓分发时再做迁移(迁移是独立决策,不改变该布局)。

## 三、确定性边界(LLM 提议 · 引擎裁决)

本体系最重要的原则:哪些交给概率/启发式,哪些必须是确定性,边界清晰。

```
        LLM 概率区(提议/产生)            确定性引擎区(裁决/编排)
      +----------------+            +------------------------+
      | 技能产出内容      |            | DAG 拓扑 / 流程顺序       |
      | 术语映射(启发式)   |   --->   | 闸门(机器可执行校验)      |
      | 语义初判          |            | 审批三态(策略或人)       |
      +----------------+            | 审计/留痕 / 全局链接校验   |
       LLM 不裁决能否过门            +------------------------+
```

- **确定性(代码判定)**:DAG 编排、拓扑顺序、闸门 pass/fail、放行顺序、审计、全局链接完整性。全部可由机器复现,与 LLM 无关。
- **概率/启发式(LLM)**:内容生产、把自然语言映射到实例、语义初判(如"这条需求写清楚了吗")、复盘候选的提炼。但这些**只是提议**,不直接放行。
- **纪律**:过不过门以闸门为准,不以 LLM 自评为准;LLM 永远不决定流程走向。**Layer 3 的吸收裁决同样确定**(判据是"已记录 change + 基准回归 + add-only",不是 LLM 自评)。

## 四、add-only 演进策略(核心)

为避免未来大规模破坏性变更,演进一律**增量**:

1. **只加可选字段 / 只加注册项 / 只加类型或版本**,永不删、永不把可选变必填。
2. **语义变更** → 开**新版本并存**(旧版保留可引退),不覆盖旧行为。
3. **废弃** → 标 `deprecated` + 并存 + 提示,到主版本才移除。
4. 具体到本仓库:
   - 加**闸门检查** = `meta/engine/gate_rules.py` 里 `@register(...)` 一条,不改引擎核心(如 `provenance_resolvable`、`realm_structure`、`link_integrity` 都是这样加进来的)。
   - 加**自动审批** = `approval_policies.py` 注册新提供者,不改 `human` 默认和 `approve/reject/hold` 三态。
   - 扩**DAG 契约** = 加可选字段;`retry/parallel/on_fail` 已声明为 forward-compat 可选(语义暂未启用)。
5. 顶层布局(`meta/`、`targets/<proj>/`)视为稳定契约,不随迭代变动。

**Layer 3 的"收敛"是这套策略的守护者**:任何复盘候选要被吸收,必须先被记录为**版本化的方法论 change**、通过**基准回归**(`bench.py` 对种子集重跑闸门)、且**add-only 兼容**;否则拒绝/延后。吸收只进 meta 层,不改目标项目产物。

**代价结构**:把"变"隔离到注册层/契约层,把"不变"的内核(引擎/校验语义)留小——花在合约稳定性上,不花在机制复杂度上(奥卡姆)。

## 五、与 OpenSpec / harness 的关系

- **本方法本身不依赖 OpenSpec**:引擎、技能、校验、可追溯、自进化只消费 `meta/` 与 `targets/<proj>/`。
- 本仓库**用 OpenSpec 自管自**(方法论自身的迭代走 `openspec/` 的 change 流程),因为当前环境恰好是 OpenSpec workspace——这是**自管自的便利**,不是 Layer 2 契约的要求。
- 同一套契约可换任何 harness(dsh 等)驱动;换 harness 属于**换 Producer**,不触引擎与闸门(见 manual 的 Producer 接口)。**具体落点 = 集成适配层** `meta/integrations/`:harness 无关的 `gateway.py`(统一 JSON 信封)+ 每个 harness 一个薄壳;换工具只改壳,核心与信封契约不动。
- **meta 工具目标中性**:所有 meta 工具 target 必填、无默认;拒绝把具体目标名写进通用层。
