# 教程(Tutorial)—— 从零上手本方法论工具体系

目标:读完后,你能**为一个新项目建立对象层、产出合规产物、并通过受控流水线跑通**,完整实现「可复用 / 可自进化 / 可把控 / 可追溯」四项。全程用**脱敏虚构案例 eShop-demo(电商订单服务)**讲述——一套含[订单、购物车、支付通道、订单事件、订单流水]的系统,字段纯属虚构,便于你在自己的项目上照做。

> 仓库的实践样例存于被 git 忽略的 `targets/`,不入版本库;本教程用模拟案例讲解,不依赖任何真实代码库。

## 前置清单

- 已装 `uv`(依赖见 `meta/scripts/pyproject.toml` + `uv.lock`)。
- 若 `~/.cache` 只读(如沙箱),设 `export UV_CACHE_DIR=$PWD/.uv-cache UV_PYTHON_INSTALL_DIR=$PWD/.uv-python`。

## Step 0 —— 理解你要做的四步

```
 ① 立对象层骨架  targets/eshop-demo/ontology/instances.yaml + components.yaml
 ② 建本体实例    每个实例标 instantiateOf → /meta/ontology/frame.yaml 的类型
 ③ 产出产物      用三技能产出需求/报告/ADR/领域模型(带 conceptRef)
 ④ 受控跑链      check.py 合规校验 + engine.py DAG 门控流水线
```

## Step 1 —— 建立对象层骨架

```
targets/eshop-demo/
  README.md                       # 声明这是对象层,只放项目产物
  ontology/
    instances.yaml                # 脊柱实例(必填)
    components.yaml               # 组件薄索引(可选但推荐)
  artifacts/
    requirements/                 # REQ-*.json
    arch-reports/                 # REP-*.json
    adr/                          # ADR-*.json
    domain-models/                # DM-*.json
```

## Step 2 —— 写本体实例(脱敏示例)

在 `ontology/instances.yaml` 列出项目**脊柱实例**,每项带一个 `instantiateOf`,指向元层 7 类之一。以 eShop-demo 为例:

| 实例 id | instantiateOf | 语义 |
|---|---|---|
| `es:order` | `Component` | 订单部件 |
| `es:cart` | `ExecutionUnit` | 下单/结算执行单元 |
| `es:payment-gateway` | `Seam` | 可替换支付通道 |
| `es:order-event` | `EventStream` | 订单事件流 |
| `es:order-log` | `PersistentState` | 订单流水(可重建) |

**规则**:实例 id 可解析、`instantiateOf` 必须是 frame 中的有效类型(Assembly / Component / Seam / ExecutionUnit / PersistentState / EventStream / ContextBoundary)。可加 `components.yaml` 薄索引,把订单各模块映到上述实例。

## Step 3 —— 用技能产出产物

三个技能(契约见 manual)的用法都是:**先对齐本体 → 按元模型产出 → 过质量门**。

### 3.1 需求理解(requirement-understanding)
输入:原始需求/访谈/愿景。产出 `artifacts/requirements/REQ-*.json`,每条符合 `requirement.schema.json`,带 `source`、`conceptRef`、`acceptanceCriteria`。

> 示例愿景:「结算时支持切换支付通道,不影响订单流程。」 → 产出 `REQ-001.json`,`conceptRef: ["es:payment-gateway", "es:order"]`,验收:换通道不改订单契约。

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
引擎按 `meta/engine/orchestrator.yaml` 声明执行 **req-understand → arch-assess → domain-model**(拓扑顺序),逐节点过闸门,任一失败即 halt 下游。arch-assess 声明 `approval: human`,默认**暂停等人工确认**(可把控),`--assume-approval` 模拟确认(自动化时用;将来可加 `policy` 阈值提供者自动放行,不动三态语义)。

## 演练总结(对照四目标)

| 目标 | 你在上面哪里实现 |
|---|---|
| **可复用** | 三技能 + frame 类型跨项目通用(Step 2/3) |
| **可自进化** | add-only:加闸门/加审批提供者/加可选字段不回破坏(见架构) |
| **可把控** | 过质量门 + DAG 门控 + 审批三态(Step 4) |
| **可追溯** | `conceptRef → 实例 → instantiateOf → 元类型` 全链可查(Step 2/3) |

## 为新项目复现的最小动线

1. `mkdir -p targets/<proj>/{ontology,artifacts/{requirements,arch-reports,adr,domain-models}}`
2. 写 `instances.yaml`(每实例 `instantiateOf`)+ 可选 `components.yaml`
3. 用三技能产出产物
4. `check.py <proj>` 校验 → `engine.py <proj> [--assume-approval]` 跑受控链
5. 若方法缺口暴露通用模式 → 回填 frame(走方法论 change),仍遵循 add-only
