## Why

建立「本体/知识底座」(方法论 Layer 0)——一套通用、可服务于任意研发项目的方法论工具体系的脊柱。当前 workspace 仅有 OpenSpec 流程外壳,尚无"同一参照系":需求、架构、领域模型三个产物各自为政,术语无法对齐、结构无法机器校验、改动无法追溯。本 change 立起双层分离的语义脊柱,并首先用 deepseek-harness(dsh)作为第一个目标验证它的机械成立。

## What Changes

- **新增元层通用本体类型(framing)**: 在 `/meta/ontology/frame.yaml` 定义 7 个通用概念类型(Assembly / Component / Seam / ExecutionUnit / PersistentState / EventStream / ContextBoundary)+ 一组关系类型 + 每类型的轻量典型属性。
- **新增四份元模型 schema**: requirement / adr / arch-report / domain-model 的 JSON Schema,带一致的元层尾巴 `meta:{schemaVersion}` 与强制 `conceptRef` 字段。
- **确立「元层/对象层」双层分离布局**: 方法论的产物(类型/schema/技能/变更)与目标项目的产物(实例/索引/ADR/报告)分仓存放,不混为一处。**BREAKING**: 任何新文档/产物必须落到两层中正确的一层,不再允许在单一松散的文档堆里放置。
- **新增最小合规校验规则**: 仅两条抓手——`instantiateOf` 指向 frame 中存在的类型、`conceptRef` 在项目本体内可解析;外加 `schemaVersion` 存在。全部由单个校验脚本执行,不引入数据库/推理/图存储。
- **示范切片**: 拉通 deepseek-harness `capability-seam` 的第一条「frame 类型 → 项目实例 → artifact」链,作为四个目标(可复用/可自进化/可把控/可追溯)的首个验收样本。

## Capabilities

### New Capabilities
- `methodology/ontology-frame`: 元层通用本体类型(frame.yaml)的内容要求——7 概念类型、关系集、轻量属性,以及"类型在元层、实例在对象层"的分离规则。
- `methodology/meta-schemas`: 四份 artifact 元模型 schema 的要求——结构、公共不变量(`schemaVersion` + `conceptRef` + 必填/枚举),以支撑下游需求/架构/建模 skill。
- `methodology/dual-realm-layout`: 双层仓库布局与放置规则——方法层产物与项目层产物分仓、连接只靠两条抓手、最小合规校验(单一脚本、零专有系统)。

### Modified Capabilities
<!-- 无既有能力被修改 -->

## Impact

- 目录: 新增 `/meta/ontology/frame.yaml`、`/meta/metaschema/*.schema.json`、`/targets/dsh/ontology/instances.yaml`、`/targets/dsh/ontology/components.yaml`、`/targets/dsh/artifacts/*`;配套一个校验脚本。
- 不依赖新系统/服务: 全部为纯文本文件 + git + 单一校验脚本,可离线、可版本化。
- 打开后续层(Layer 1 技能包 / Layer 2 治理 / Layer 3 自进化)的实施前提。
