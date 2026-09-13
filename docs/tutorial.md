# 教程(Tutorial)—— 从零上手本方法论工具体系

目标:读完后,你能**为一个新项目建立对象层、产出合规产物、通过受控流水线跑通、并做全局可追溯校验**,完整实现「可复用 / 可自进化 / 可把控 / 可追溯」四项。全程用**脱敏虚构案例 eShop-demo(电商订单服务)**讲述——一套含[订单、购物车、支付通道、订单事件、订单流水]的系统,字段纯属虚构,便于你在自己的项目上照做。

> 仓库的实践样例存于被 git 忽略的 `targets/`,不入版本库;本教程用模拟案例讲解,不依赖任何真实代码库。

## 前置清单

- 已装 `uv`(依赖见 `meta/scripts/pyproject.toml` + `uv.lock`)。
- 若 `~/.cache` 只读(如沙箱),设 `export UV_CACHE_DIR=$PWD/.uv-cache UV_PYTHON_INSTALL_DIR=$PWD/.uv-python`。

## Step 0 —— 理解你要做的五步

```
  ① 立对象层骨架  targets/eshop-demo/ontology/{instances,components,sources}.yaml(三份必需)
  ② 建本体实例    每个实例标 instantiateOf → /meta/ontology/frame.yaml 的类型
  ③ 产出产物      用三技能产出需求/报告/ADR/领域模型(带 conceptRef + source)
  ④ 受控跑链      check.py 合规校验 + engine.py DAG 门控流水线
  ⑤ 校验可追溯    tracer.py verify / report / refs(全局链接完整性 + 反向查询)
```

## Step 1 —— 建立对象层骨架

对象层三份文件**必需**(可用 `/meta/templates/` 套用):

```
targets/eshop-demo/
  README.md                       # 声明这是对象层,只放项目产物
  ontology/
    instances.yaml                # 脊柱实例(必需)
    components.yaml               # 组件薄索引(必需;每项 ref 须解析到实例)
    sources.yaml                  # 来源注册表(必需;登记非文件来源)
  artifacts/
    requirements/                 # REQ-*.json
    arch-reports/                 # REP-*.json
    adr/                          # ADR-*.json
    domain-models/                # DM-*.json
```

## Step 2 —— 写本体实例与来源(脱敏示例)

### 2.1 instances.yaml
列出项目**脊柱实例**,每项带 `instantiateOf`,指向元层 7 类之一:

| 实例 id | instantiateOf | 语义 |
|---|---|---|
| `es:order` | `Component` | 订单部件 |
| `es:cart` | `ExecutionUnit` | 下单/结算执行单元 |
| `es:payment-gateway` | `Seam` | 可替换支付通道 |
| `es:order-event` | `EventStream` | 订单事件流 |
| `es:order-log` | `PersistentState` | 订单流水(可重建) |

**规则**:实例 id 唯一可解析、`instantiateOf` 必须是 frame 中的有效类型(Assembly / Component / Seam / ExecutionUnit / PersistentState / EventStream / ContextBoundary)。

### 2.2 components.yaml
薄索引,把各模块映到实例;**每项 `ref` 必须解析到某个实例**(否则 `realm_structure` 拦下):

```yaml
components:
  - name: order-service
    path: src/order
    ref: es:order
  - name: payment-adapter
    path: src/payment
    ref: es:payment-gateway
```

### 2.3 sources.yaml(来源注册表)
需求 `source` 必须是 `file:<存在的路径>` 或在此登记的 id。**没有文件的来源(访谈/愿景)必须显式登记并说明**,不得编造:

```yaml
sources:
  - id: eshop-vision
    kind: vision
    ref: ""
    note: eShop「结算支持切换支付通道」愿景(演示,无文件)
```

## Step 3 —— 用技能产出产物

三个技能(契约见 manual)的用法都是:**先对齐本体 → 按元模型产出 → 过质量门**。

### 3.1 需求理解(requirement-understanding)
输入:原始需求/访谈/愿景。产出 `artifacts/requirements/REQ-*.json`,每条符合 `requirement.schema.json`,带 `source`、`conceptRef`、`acceptanceCriteria`。

> 示例愿景:「结算时支持切换支付通道,不影响订单流程。」 → 产出 `REQ-001.json`,`source: "eshop-vision"`(已登记),`conceptRef: ["es:payment-gateway", "es:order"]`,验收:换通道不改订单契约。

> `source` 若写成自由文本(如"某某访谈#1")且无处对应,会被 `provenance_resolvable` 拦下——**伪溯源过不了门**。

### 3.2 架构评估(architecture-assessment)
输入:需求集 + 现状架构。产出 `arch-reports/REP-*.json`(`targetRef` 指向被评估实例)+ `adr/ADR-*.json`(`status` + `supersedes` 决策链)。

> 示例:`REP-001` 评估支付通道 `es:payment-gateway`;`ADR-001` 记录「用可替换支付通道,不侵入订单流程」的决策。

### 3.3 领域建模(domain-modeling)
输入:需求 + 领域术语。产出 `domain-models/DM-*.json`,实体各带 `conceptRef`,`boundedContexts` + `invariants` + `relationships`。

> 示例:`DM-001` 含实体 Order/Checkout/PaymentGateway(各带 `es:*` conceptRef),限界上下文 `payment`,不变量(如「通道切换不改订单状态」)。

## Step 4 —— 过质量门与受控流水线

### 4.1 Layer 0 合规校验(单一校验器)
```bash
uv run --project meta/scripts python meta/scripts/check.py targets/eshop-demo
```
对每份产物跑三段不变量:①`meta.schemaVersion` 存在;②结构/枚举合法(符合 4 schema);③所有 `conceptRef`(+report `targetRef`)在 instances 内解析。示例输出:N 产物、0 failure。

### 4.2 Layer 2 受控流水线(DAG 引擎)
```bash
# 全链放行(把审批点的 human 视为已确认,非交互)
uv run --project meta/scripts python meta/engine/engine.py targets/eshop-demo --assume-approval

# 默认:human 审批点 HOLD(人环暂停演示)
uv run --project meta/scripts python meta/engine/engine.py targets/eshop-demo

# 查看审计轨迹
cat targets/eshop-demo/.audit/run-*.jsonl
```
引擎按 `meta/engine/orchestrator.yaml` 执行 **realm-check → req-understand → arch-assess → domain-model → trace-check**(拓扑顺序),逐节点过闸门,任一失败即 halt 下游:

- `realm-check`:`realm_structure` 校验对象层三文件(实例/组件 ref/来源结构);
- `req-understand`:`schema_requirement + concept_ref + provenance_complete + provenance_resolvable`;
- `arch-assess`:`approval: human` → 默认**暂停等人工确认**(可把控),`--assume-approval` 模拟确认;
- `domain-model`:`schema_domain_model + concept_ref + invariant_present`;
- `trace-check`:`link_integrity` 全局链接完整性(收口门)。

> 将来可加 `policy` 阈值提供者自动放行,不动三态语义。

## Step 5 —— 全局可追溯(Layer 4)

```bash
T="uv run --project meta/scripts python meta/trace/tracer.py"
$T verify targets/eshop-demo                 # 链接完整性(硬门):exit 0 = 通过
$T report targets/eshop-demo                 # 需求下游覆盖比 + 孤儿概念
$T refs   targets/eshop-demo es:payment-gateway   # 反向查询:谁引用了该概念
$T why    targets/eshop-demo REQ-001         # 该需求的下游链
```

- `verify` 是**硬门**:链接可解析、id 唯一、ADR 取代链存在且无环、取代状态一致。
- `report` 是**指标**(非门):告诉你哪些需求下游无人承接、哪些概念是孤儿——可作为下一步改进信号。

## 演练总结(对照四目标)

| 目标 | 你在上面哪里实现 |
|---|---|
| **可复用** | 三技能 + frame 类型跨项目通用(Step 2/3) |
| **可自进化** | 复盘→收敛裁判(记录+回归+add-only)吸收改进;add-only 加闸门/加审批/加字段不破坏(见架构) |
| **可把控** | 过质量门 + DAG 门控 + 审批三态 + realm/trace 收口门(Step 4) |
| **可追溯** | `conceptRef → 实例 → instantiateOf → 元类型` 全链可查 + `source` 可校验 + 全局完整性/反向查询(Step 2/3/5) |

## 为新项目复现的最小动线

1. 建目录并套用模板:`mkdir -p targets/<proj>/ontology` → 复制 `meta/templates/{instances,components,sources}.template.yaml`。
2. 写三份对象层文件(每实例 `instantiateOf`;组件 `ref` 指向实例;来源登记)。
3. 用三技能产出产物(`source` 须可解析)。
4. `check.py <proj>` 校验 → `engine.py <proj> [--assume-approval]` 跑受控链 → `tracer.py verify <proj>` 校验全局追溯。
5. 若方法缺口暴露通用模式 → 走 Layer 3 复盘吸收(记候选 → 收敛裁判 → 发起方法论 change),仍遵循 add-only。
