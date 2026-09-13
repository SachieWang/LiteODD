## Why

对 `targets/dsh` 做覆盖度量化时发现一处**不可见的本体漂移**:domain model 的 `relationships[].type` 用了 frame 未声明的关系类型,meta 层任何地方都没有这些词。

手工排查时(只 grep 了 `consumes`)最初只看到 **1 个**;指标实现后实跑暴露的是 **5 个**——`applies` / `consumes` / `hasScope` / `isA` / `uses`,横跨 DM-001..003,其中 **DM-002 的 3 个关系类型全部未声明**。这个数量差距本身就是本 change 的理由:**人工抽查看不见的东西,指标一跑就看见了。**

三层校验全部放行,因为各自都不管关系类型:

- `domain-model.schema.json` 对 `relationships` 只约束 `{type:array, items:{type:object}}`,**不约束 `type` 取值**;
- `check.py` 只查 `instantiateOf` 锚定与 `conceptRef` 可解析;
- `gate_rules.py` **无任何关系类型规则**。

**但本 change 刻意不引入硬门。** 因为 frame 的 8 个关系类型目前是**光秃秃的 id**——没有含义,也没有 `from`/`to` 的方向约定。在无语义的前提下加硬门,只会逼作者去猜"`consumes` 是不是 `usedBy`",把**本体词汇的语义决定权**偷偷转移给实现者;而且这个决定若基于单一同源目标(dsh)作出,恰恰是"被单一目标拟合"。

因此本 change 只交付**只报告不拦截**的一致性指标,沿用 `tracer.py` 覆盖度指标的既有先例(*reported, not used as a hard gate*),让漂移**可见**;语义与硬门留待异质目标提供依据后再定。

## What Changes

- 扩展 `/meta/trace/tracer.py report`:新增**关系类型一致性**指标——frame 声明了几个关系类型、其中几个被 domain model 真实使用、哪些**用了但未声明**、哪些**声明了但从未使用**。
- **明确非门**:`report` 依旧恒返回 `0`,任何漂移都不阻断流水线;`verify`(硬门)行为不变。
- **add-only**:只新增一个指标与一段报告输出,不改既有覆盖度指标、不改 `verify`、不改引擎与 schema、不新增依赖。
- **不改目标产物**:`targets/dsh` 的 `consumes` **保持原样**——它现在是一条要被看见的**证据**,不是要被悄悄修掉的错误。

## Capabilities

### New Capabilities
<!-- 无新增能力 -->

### Modified Capabilities
- `methodology/traceability`: 新增"关系类型一致性指标"要求(报告非门)。

## Impact

- 修改:`/meta/trace/tracer.py`(新增 `relation_conformance()` 与 `report` 输出段)。
- 新增:无(不新增文件、不新增依赖)。
- **不动**:`frame.yaml`、`metaschema/*`、`gate_rules.py`、`orchestrator.yaml`、任何 `targets/` 产物。
