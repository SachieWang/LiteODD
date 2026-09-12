## Why

Layer 0/1/2/3 已让产物"带链接"(conceptRef / targetRef / supersedes / source),但**没有任何环节对**跨 artifact 的链接做全局校验:悬空的决策链、循环的取代关系、只挂在需求侧而下游无人引用的概念,都不会被发现——"可追溯"目前仍是**逐条校验(每份 artifact 自洽)**,不是**全局链路自洽**。本 change 立起 **Layer 4 可追溯层**:以确定性校验器对全局 provenance 做完整性校验,并提供反向查询,回答"这条需求/这个决策/这个领域实体**凭什么**如此"。

## What Changes

- **新增确定性链接完整性校验 `link_integrity`**:全局校验 ① 所有 `conceptRef`/`targetRef` 可解析;② 每个 artifact id 唯一;③ ADR `supersedes` 指向存在的 ADR、无环;④ 被取代的 ADR 应标 `superseded`(且标 `superseded` 者确被取代)。失败即 halt。
- **新增可追溯工具 `meta/trace/tracer.py`**:`verify`(确定性校验)、`report`(覆盖度/链完整度**指标**)、`refs`(**反向查询**:某概念/某 artifact 被谁引用;某需求的下游链)。
- **新增 DAG 阶段 `trace-check`**:依赖 架构评估 + 领域建模,对全部 artifact 跑 `link_integrity`,作为全链收口门。
- **不引图数据库/推理机**:反向索引在内存中确定性计算。
- **add-only**:新增能力/规则/阶段;不改四份 schema、不改既有规则。

## Capabilities

### New Capabilities
- `methodology/traceability`: 全局可追溯契约——链接完整性(硬门)、覆盖度指标、反向查询;确定性、无图存储。

### Modified Capabilities
<!-- 无既有能力被修改 -->

## Impact

- 新增:`/meta/trace/{tracer.py, README.md}`;`realm_structure` 同级的 `link_integrity` 规则;`orchestrator.yaml` 的 `trace-check` 阶段。
- 复用:既有引擎/闸门注册/实例与 artifact 文件;不改 frame、不改 schema、不新增依赖、不依赖 OpenSpec/harness。
