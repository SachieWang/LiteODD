## Context

演示中 REQ-005 的 `source` 为编造字符串却过了门,暴露"来源链"未被校验。动机见 proposal.md;行为要求见两份 delta spec。约束:确定性(LLM 不裁决)、add-only、KISS、与 OpenSpec/harness 解耦。这是 Layer 3 的一次**真实吸收**(target: gate + skill),按纪律走方法论 change。

## Goals / Non-Goals

**Goals:**
- 新增确定性规则 `provenance_resolvable`,使 `source` 可机器校验。
- 为目标侧"非文件来源"提供**显式登记**途径(`sources.yaml`),避免为过门而伪造文件。
- 修正既有 5 条需求的 source 为诚实且可校验的值;更新技能 source 约定。

**Non-Goals:**
- 不改四份 artifact schema 的结构(`source` 仍是 string,不新增必填字段)——纯新增规则。
- 不校验 `session:`/`https:` 内容本身(那是外部系统);只校验"文件存在"或"注册表已登记"。
- 不改 frame、不改引擎核心、不改审批/编排语义。

## Decisions

1. **`source` 支持两种可校验形态**:
   - `file:<repo-relative-path>` → 路径**必须存在**(最强校验);
   - `<source-id>` → 必须存在于目标项目 `ontology/sources.yaml` 注册表。
   二者之外(自由文本)一律不合规。
   - 备选:只允许 `file:` → 会逼着为"没有文件"的来源伪造文件,反而更糟;故引入注册表。
2. **来源注册表 `ontology/sources.yaml`**(目标侧,新 artifact):每条 `{id, kind, ref, note}`。
   把"会话/愿景/无文件"等来源**显式登记并说明**,使溯源诚实且可审计——`kind` 标明来源种类,`ref` 可放 session id,`note` 说明为何无文件。
3. **规则为加性注册**:`gate_rules.register("provenance_resolvable")`,引擎核心不变;`orchestrator.yaml` 的 req 阶段 gate 列表加入该规则。符合 Layer 2 的 add-only 闸门注册纪律。
4. **ctx 重构(内部,不改外部契约)**:闸门 `ctx` 由元组升级为字典 `{target, instances, itypes}`,以便新规则读取目标侧 `sources.yaml`;各既有规则同步取值方式,行为不变。
5. **既有数据迁移**:REQ-001~003 → `arch-analysis-dsh`(dsh 架构讲解会话 `session-1038c1d3-...`);REQ-004 → `vision-agent-scope`(其他会话愿景,显式登记);REQ-005 → `demo-round2-terminal-seam`(本演示会话 `session-eec833c0-...`)。诚实、可校验。
6. **技能同源更新**:需求理解技能输出约定改为"source 须为可解析引用",否则生产者会继续产自由文本,规则与生产脱节。

## Risks / Trade-offs

- [新规则可能误伤合法但无文件的来源] → 用注册表登记而非放行自由文本;登记需说明,仍可审计。
- [规则接入后 bench 可能失败(既有 source 不合规)] → 正是回归门的价值:先失败 → 修正数据 → 再跑通过;不通过不得吸收。
- [ctx 重构触及既有规则] → 全部为内部取值调整;跑 bench 回归确认行为不变。
- [注册表被滥用为"什么都登记"] → `kind`/`note` 必填 + 人工评审;`file:` 优先(能落文件就落文件)。

## Migration Plan

1. 注册规则 + 接入 orchestrator。2. 新增 `targets/dsh/ontology/sources.yaml`。3. 修正 REQ-001~005 的 source。4. 更新技能约定(源 + `.agents` 副本)。5. 跑 bench(engine+check)回归必经。6. 回滚:纯文本 + git。

## Open Questions

无(设计已定:两种可校验形态 + 目标侧注册表 + 加性规则)。
