# 参考手册(Manual)

面向使用者与扩展者的完整参考。覆盖:元模型 schema、frame、三技能契约、引擎契约、可追溯契约、自进化契约、CLI、演进规范。

## 1. 元模型(artifact schema,meta 层)

目录:`meta/metaschema/`。四份 JSON Schema 定义产物结构。

| schema | 根键 | 关键必填 | 特有字段 |
|---|---|---|---|
| `requirement.schema.json` | `requirement` | id, title, source, conceptRef, meta | `acceptanceCriteria`,`type`(functional/quality/constraint) |
| `adr.schema.json` | `adr` | id, date, status, decision, conceptRef, meta | `status`(proposed/accepted/superseded),`supersedes`(决策链) |
| `arch-report.schema.json` | `report` | id, targetRef, conceptRef, meta | `targetRef`,`views`,`assessments`,`recommendations` |
| `domain-model.schema.json` | `domainModel` | id, conceptRef, meta | `entities`(每实体带 conceptRef),`boundedContexts`,`relationships`,`invariants` |

**三段公共不变量(`check.py` 强制):**
1. `meta.schemaVersion` 必须存在(元层版本化)。
2. 结构/枚举合法(符合对应 schema)。
3. 所有 `conceptRef`(及 report 的 `targetRef`)能在目标项目 `instances.yaml` 内解析。

> 引擎闸门在此之上追加**确定性**规则:`source` 须可机器校验(见 §4.2 `provenance_resolvable`)、对象层结构须合法(`realm_structure`)、全局链接须完整(`link_integrity`)。

## 2. 本体 frame(meta 层)

文件:`meta/ontology/frame.yaml`。定义 7 通用**类型**和 8 关系:**类型在元层,实例在对象层**。

**7 类型:**

| 类型 | 语义 | 典型属性 |
|---|---|---|
| `Assembly` | 组装/配置层如何拼出 | composedOf, layeredBy, overrideRule |
| `Component` | 被拆解的单元 | name, responsibility |
| `Seam` | 可替换端口-适配器边界 | contract, providers, consumers |
| `ExecutionUnit` | 可触发、有边界的执行单元 | trigger, boundaryStart/End, sideEffects |
| `PersistentState` | 可重建/可追溯的状态 | appendOnly, reconstructable, invariants |
| `EventStream` | 事件的产生/观察/排序 | producers, observers, ordering |
| `ContextBoundary` | 隔离/作用域边界 | isolation, shadowable, restricts |

**8 关系:** `composes, providedBy, usedBy, triggers, writes, reads, dependsOn, constrains`。

**分离规则:** 项目实例(如脱敏案例中 `es:payment-gateway`)是**实例**(对象层),`Seam` 是**类型**(frame);实例通过 `instantiateOf: Seam` 指回类型。frame 中**不得出现**项目专属词(如支付通道名)。

## 3. 技能契约(Layer 1)

目录:`meta/skills/<name>/SKILL.md`(源)+ 副本 `.agents/skills/<name>/SKILL.md`(供 agent 加载,源为准)。每个技能固定**五段契约**,且强制**先对齐本体 → 按元模型产出 → 过质量门**。

| 技能 | 输入 | 输出 | 质量门 |
|---|---|---|---|
| `requirement-understanding` | 原始需求/访谈/愿景 | `artifacts/requirements/*.json` | schema_requirement + concept_ref + provenance_complete + **provenance_resolvable** |
| `architecture-assessment` | 需求集 + 现状架构 | `arch-reports/` + `adr/` | schema_arch_report + schema_adr + target_ref_resolves + concept_ref |
| `domain-modeling` | 需求 + 领域术语 | `domain-models/*.json` | schema_domain_model + concept_ref + invariant_present |

三技能都复用 `check.py` 跑三段不变量 + 各自语义抽查;未过质量门的产物不释放为基线。需求来源(`source`)必须落成 `file:<存在路径>` 或 `sources.yaml` 登记 id,否则由 `provenance_resolvable` 拦下。

## 4. 引擎契约(Layer 2)

目录:`meta/engine/`。engine 的 target **必填**(meta 层不内嵌默认目标)。

### 4.1 orchestrator.yaml(DAG)

```yaml
schemaVersion: "1.0"          # DAG 契约版本(目标由运行时参数提供,文件内不写死)
stages:
  - id: realm-check
    deps: []
    artifacts: []                                   # 校验对象层结构,读 ctx["target"]
    gate: [realm_structure]
    approval: none
  - id: req-understand
    deps: [realm-check]
    artifacts: ["artifacts/requirements/*.json"]
    gate: [schema_requirement, concept_ref, provenance_complete, provenance_resolvable]
    approval: none
  - id: arch-assess
    deps: [req-understand]
    artifacts: ["artifacts/arch-reports/*.json", "artifacts/adr/*.json"]
    gate: [schema_arch_report, schema_adr, target_ref_resolves, concept_ref]
    approval: human          # 人环暂停默认
  - id: domain-model
    deps: [req-understand]
    artifacts: ["artifacts/domain-models/*.json"]
    gate: [schema_domain_model, concept_ref, invariant_present]
    approval: none
  - id: trace-check
    deps: [arch-assess, domain-model]
    artifacts: ["artifacts/**/*.json"]              # 全量:全局链接完整性
    gate: [link_integrity]
    approval: none
```

字段:`stages[].deps`(DAG 边)、`artifacts`(产物 glob,相对 target)、`gate`(闸门规则集)、`approval`(审批提供者)、顶层 `schemaVersion`、`forwardCompatibility`(声明性备注)。forward-compat 可选字段 `retry/parallel/on_fail` 已声明、语义未启用。

### 4.2 闸门规则注册表(gate_rules.py)

单向 `@register(rule_id)`。现存规则:

| 规则 | 检查 |
|---|---|
| `schema_requirement` / `schema_arch_report` / `schema_adr` / `schema_domain_model` | 结构符合对应 metaschema |
| `concept_ref` | 所有 conceptRef/targetRef 在 instances 解析 |
| `target_ref_resolves` | report 的 targetRef 解析 |
| `provenance_complete` | 需求含 source + 非空 acceptanceCriteria |
| `provenance_resolvable` | 需求 `source` 为 `file:<存在路径>` 或 `sources.yaml` 登记 id(杜绝伪溯源) |
| `realm_structure` | 对象层三文件(instances/components/sources)存在且结构合法;components 的 `ref` 须解析到实例 |
| `link_integrity` | 全局链接完整性(委托 `tracer.verify_target`,单一事实来源) |
| `invariant_present` | 领域模型含 boundedContexts + invariants |
| `dangling_ref` | 一致性(增量示例):引用存在 + instantiateOf 有效 |

**加新规则 = register 一条,不改引擎。**

### 4.3 审批策略提供者(approval_policies.py)

返回三态 `approve / reject / hold`,引擎只按三态执行。

| 提供者 | 行为 |
|---|---|
| `human`(默认) | 返回 `hold`,引擎暂停等显式人工确认(`--assume-approval` 下视为 approve) |
| `policy`(加性) | 阈值计算 approve/reject/hold(自动,示例,非默认) |

**加自动审批 = 注册新提供者,不改 human 默认与三态语义。** 审批 ≠ 闸门:闸门是机器裁决;审批是放行策略。

### 4.4 审计

每次运行写 `targets/<proj>/.audit/run-<ts>.jsonl`,每行一条(引擎元数据 + 每节点 `{stage,status,failedGates,approvalProvider,files}`),供 Layer 4 可追溯与 Layer 3 自进化。

## 5. 可追溯契约(Layer 4)

目录:`meta/trace/`。工具 `tracer.py`,子命令:

| 子命令 | 作用 |
|---|---|
| `verify <target>` | 全局链接完整性(硬门):conceptRef/targetRef 可解析、artifact id 唯一、ADR `supersedes` 存在且**无环**、取代状态一致 |
| `report <target>` | 覆盖度**指标**(非门):需求下游覆盖比 + 孤儿概念(被任何 artifact 引用为 0) |
| `refs <target> <concept\|id>` | 反向查询:哪些 artifact 引用了该概念/该 id(按类型分组) |
| `why <target> <REQ-id>` | 某需求的下游链(其概念 → 引用这些概念的下游 artifact) |

**完整性 vs 覆盖度**:完整性是自洽性错误(必然错误)→ 硬门;覆盖度是质量信号(某需求可能确无下游)→ 仅报告。**无图存储**:反向索引内存即时计算。

## 6. 自进化契约(Layer 3)

目录:`meta/evolution/`。

- **捕获**:`retro.md` 模板 + 候选记录(信号/证据/吸收目标/版本/add-only);**实践记录放对象层**(`targets/<proj>/evolution/retro/`),meta 只放模板与通用示例。
- **收敛裁判** `judge.py`:候选须同时满足 ① 已记录为**版本化的方法论 change**(change 记录存在 + 版本 + 合法 target + id)② **基准回归**通过(`bench.py`)③ **add-only 兼容**;否则 REJECT/DEFER 并点名失败条件。
- **基准回归** `bench.py`:对目标重跑 Layer 2 引擎(全部闸门)与 `check.py`;两者全过才 PASS。
- **吸收 = 发起一条方法论 change**(不就地改 meta;裁判只当准入门);吸收只进 meta 层,不改目标产物。

## 7. CLI 参考

**所有 meta 工具 target 必填,无默认目标。**

```bash
# Layer 0 合规校验
uv run --project meta/scripts python meta/scripts/check.py <target>

# Layer 2 受控流水线
uv run --project meta/scripts python meta/engine/engine.py <target> [--assume-approval] [--dry-run] [--orchestrator <path>]

# Layer 4 可追溯
uv run --project meta/scripts python meta/trace/tracer.py {verify|report|refs|why} <target> [key]

# Layer 3 自进化
uv run --project meta/scripts python meta/evolution/bench.py <target>
uv run --project meta/scripts python meta/evolution/judge.py <candidate.yaml> [--target <target>]
```

| 命令/选项 | 作用 |
|---|---|
| `<target>` | 目标项目目录(**必填**;缺失即报错) |
| `engine --assume-approval` | 把 human 审批的 HOLD 视为已确认(非交互) |
| `engine --dry-run` | 只计算,不写审计 |
| `engine --orchestrator` | 指定 DAG 配置(默认 `meta/engine/orchestrator.yaml`) |
| `judge --target` | 基准回归目标(仅 `bench_status: auto` 时必需) |

退出码:`check.py` 0 通过 / 1 失败 / 2 缺 target;`engine` 0 全过全放行 / 1 闸门失败(halt)/ 2 审批 HOLD/REJECT;`tracer verify` 0 完整 / 1 有错;`judge` 0 ACCEPT / 1 REJECT。

## 8. 演进规范(扩展手册)

| 你想做 | 怎么做(都不破坏) |
|---|---|
| 加闸门检查 | `meta/engine/gate_rules.py` 里 `@register("new_rule")` 写函数 |
| 加自动审批 | `meta/engine/approval_policies.py` 注册新 provider |
| 加产物类型 | 新增 `meta/metaschema/*.schema.json` + 在 `check.ARTIFACT_SCHEMA` 注册根键 |
| 扩 frame 类型 | 在 `frame.yaml` 的 `conceptTypes` 加一项(additive) |
| 扩 DAG 语义 | 加可选字段(forward-compat)或开新版本并存 |
| 新项目 | 建 `targets/<proj>/`,套用 `/meta/templates/` 写 `instances.yaml`+`components.yaml`+`sources.yaml`(三份必需),产产物,跑 check → engine → tracer verify |
| 吸收一次实践改进 | 走 Layer 3:记候选 → 收敛裁判(记录+回归+add-only)→ 发起方法论 change 落地 |

**硬规则**:永不删字段、永不把可选变必填、语义变更开新版本共存;frame/metaschema/engine 契约不绑定 OpenSpec 或任何 harness;meta 工具不内嵌任何具体目标。
