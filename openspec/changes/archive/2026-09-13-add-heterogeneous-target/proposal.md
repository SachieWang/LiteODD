## Why

README 把「可复用」写成"类型在元层、技能跨项目通用",但证据只有 **`targets/dsh` 一个目标**,而且它是**同源 dogfood**:方法论与 DSH 出自同一批人、同一时期、互相塑造。单一同源样例无法区分两件事:

- **(A)** 类型与技能**真的通用**;
- **(B)** 它们只是被**这一个目标的形状拟合**出来了。

**缺口已经量化**(frame 声明 7 概念类型 + 8 关系类型):

| 维度 | frame 声明 | `targets/dsh` 实际 | 缺口 |
|---|---|---|---|
| 概念类型 | 7 | **5** | `Component`、`ContextBoundary` 从未实例化 |
| 关系类型 | 8 | **4** | `usedBy`、`reads`、`dependsOn`、`constrains` 从未使用 |

**漂移已经发生,且此前无人察觉**:三个 domain model 合计使用了 **5 个 frame 未声明的关系类型**——`applies` / `consumes` / `hasScope` / `isA` / `uses`,其中 **DM-002 的 3 个关系类型全部未声明**。三层校验此前**全部放行**,直到 `relation-conformance-report` change 才把它变成可见指标。

一个同源目标就已经如此。所以"通用性"目前是**声称**,不是**证据**;本 change 就是去取这个证据。

## What Changes

开一个**异质目标项目** `targets/<project>/`,用**已冻结的 meta 层**跑完五层全链。

- **核心纪律:不得为了让目标过门而修改 meta 层。** 一旦发现"必须改 meta 才能跑通",那**本身就是最有价值的产出**——它精确定位了通用性的边界,应当走 Layer 3 吸收流程(`retro 候选 → judge → change`),而不是就地放宽契约。
- **异质三维度,至少覆盖两个**:① 领域异质(非 agent、非开发者工具);② 类型异质(逼出 `Component` 与 `ContextBoundary` 的真实用法);③ 规模异质(实例与产物显著多于现状)。
- **本 change 不交付方法论改动**:它是**实践**活动,预期 meta 层零改动,故 `skip_specs: true`。

## Capabilities

<!-- skip_specs:本 change 不改变任何 spec 级行为。它的产出是"通用性是否成立"的证据,以及(若确有必要)派生出的独立方法论 change。 -->

## Impact

- 新增:`targets/<project>/`(对象层;`targets/` 默认被 git 忽略,不入版本库)。
- **预期不修改**任何 meta 层文件(frame / metaschema / skills / engine / evolution / trace)。
- 复用:既有三技能、单一校验器、DAG 引擎与闸门、`bench.py` 回归、`tracer.py` 的覆盖度与关系类型指标。
- 关键输入:`relation-conformance-report` 暴露的 5 个未声明关系类型——F 的异质数据将用于判断"frame 的 8 个关系类型应当有语义与方向约定吗",该判断此前**刻意推迟**,避免在单一同源目标上拍板通用本体词汇。
