## Context

本 workspace 当前只有 OpenSpec 流程外壳(`.agents/skills`、空的 `openspec/changes` 与 `specs`)。动机与范围见 proposal.md。目标是把方法论 Layer 0(本体/知识底座)立起来:一面通用脊柱(frame 类型 + 元模型 schema),一面分仓的项目实例,并首推 deepseek-harness 的 capability-seam 作为示范链。

约束:奥卡姆剃刀 + K.I.S.S.——不引入数据库/推理/图存储,全部为纯文本文件 + git + 一个校验脚本。

## Goals / Non-Goals

**Goals:**
- 立起 7 类型 + 8 关系 + 轻属性的通用 frame。
- 立起四份元模型 schema 及"三段不变量"。
- 确立元层/对象层双仓布局与"两抓手"连接。
- 拉通 dsh `capability-seam` 的 frame→实例→artifact 示范链,作为四目标首件验收样本。

**Non-Goals:**
- 不做任何推理 / 一致性检测 / 自动生成(明确砍掉 OWL、SHACL、图形库、数据库)。
- 不把方法库(反模式/启发式)放进本体层,移交后续 Layer 1。
- 不追求对 dsh 全 20 个包组的完整建模(只做薄索引 `components.yaml`)。
- 本 change 不实现 Layer 1 技能包 / Layer 3 自进化循环,只为其铺前提。

## Decisions

1. **7 通用类型而非"完整本体"**。从 dsh 抽象出任何系统都有的模式(Assembly/Component/Seam/ExecutionUnit/PersistentState/EventStream/ContextBoundary);名字刻意不用 dsh 专用词(`capability-seam`→`Seam`、`turn`→`ExecutionUnit`),保持通用。
   - 备选:OWL/RDF 完整本体 → 砍(推理是复杂度第一来源)。
2. **元层/对象层双仓分离**。frame 类型与 schema 在元层;项目实例/索引/产物在对象层;靠 `instantiateOf`+`conceptRef`+`schemaVersion` 连接。
   - 备选:单仓松散堆叠 → 会污染通用性或断项目追溯,弃;先同工作区两个目录根,工具成型可分叉配送。
3. **存储 = 目录 + YAML + JSON Schema + git**。零运维、可离线、人可读。
   - 备选:图形数据库/语义网引擎 → 项目体量(几十节点)用不上,砍。
4. **单一校验脚本**做"三段不变量",不引入专有校验服务。语言为 **Python,用 uv 管理虚拟环境与依赖**(`uv run`),脚本无第三方运行时依赖可直跑;不用 JS/TS,保持工具栈一致性(本方法论面向研发,避免在元层引入另一套语言工具链)。
   - 备选:Node/JS 脚本 → 换用 Python + uv,K.I.S.S. + 工具链统一。

映射(对象实例→frame 类型):Profile/Bundle/Plugin/ConfigLayer→Assembly;ServiceDefinition/Provider/Consumer(capability-seam)→Seam;Agent/Turn/Step/ToolCall→ExecutionUnit;Session(Log)→PersistentState;Event→EventStream;Scope/agent.ctx/Restriction→ContextBoundary;20 包组→Component。

## Risks / Trade-offs

- [过于薄的本体被质疑"不专业"] → 明确功能目标:够让技能跑起来 + 够让项目实例合规,即可,不为完备性牺牲简单。
- [两抓手被滥用,出现无主产物/断链] → 校验脚本强制:任何 artifact 必须过 schemaVersion/结构/conceptRef 三段;产物无 conceptRef 则进不了门。
- [对象层产物误入元层,污染通用 frame] → 放置规则 + 校验:frame 中出现项目专用名即报不合规。
- [实例可解析但概念漂移(语义含糊)] → 最小治理:实例变更走既有 change 流程 + `F4` 反向索引(git 可搜),暂不做图/索引系统。

## Migration Plan

1. 在当前工作区建 `/meta/`(frame + metaschema + 校验脚本)与 `/targets/dsh/`(instances + components + artifacts)两个根。
2. 写入设计产物;若有需要,后续把 `/meta/` 独立成可分发的工具仓。
3. 回滚:全部为纯文本文件 + git,无需迁移/回滚系统。

## Open Questions

- `/meta/` 与 `/targets/` 最终是否拆成两个独立 git 仓库 —— 可延后(MVP 先用同工作区两目录根,拆仓很便宜)。
- 首个对象层内部是否要独立的 change 流程管理 project.changes —— 延后,复用既有 OpenSpec 流程即可。
