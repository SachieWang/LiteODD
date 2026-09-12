## Why

一次真实演示暴露了可追溯的空洞:REQ-005 的 `source` 是我编造的字符串(`新需求访谈#Round2`),而**仓库里并不存在该文件**,它却通过了质量门。原因:现有 `provenance_complete` 规则**只检查 `source` 非空**,不校验其**可解析性**——"可追溯"目前只做了一半(概念链真、来源链虚)。本 change 用一个**确定性**闸门规则堵住该漏洞,并把既有需求条目的来源改成**可机器校验**的形式。

## What Changes

- **新增确定性闸门规则 `provenance_resolvable`**:需求条目的 `source` 必须是
  ① `file:<仓库相对路径>` 且该路径**存在**,或
  ② 目标项目 `ontology/sources.yaml` 注册表内**存在**的来源 id;
  否则该条**不释放**(确定性判定,LLM 不参与)。
- **新增目标侧来源注册表** `targets/dsh/ontology/sources.yaml`:把"非文件"来源(会话/愿景)显式登记并说明,杜绝伪溯源。
- **修正既有需求来源**:REQ-001~003 → `arch-analysis-dsh`(dsh 架构讲解会话);REQ-004 → `vision-agent-scope`(其他会话愿景);REQ-005 → `demo-round2-terminal-seam`(本演示会话),全部诚实且可校验。
- **更新需求理解技能** 输出约定:`source` 须为可解析引用,不得自由文本。
- **add-only**:只**新增**规则与注册项,不改既有 schema(DELTA 为 ADDED 要求),不删既有字段。

## Capabilities

### New Capabilities
<!-- 无新增能力 -->

### Modified Capabilities
- `methodology/meta-schemas`: 新增"来源可解析(provenance resolvability)"要求——artifact 的 `source` 必须机器可校验。
- `methodology/requirement-understanding`: 新增"来源须为可解析引用"要求——技能产出的 `source` 不得是自由文本。

## Impact

- 修改:`/meta/engine/gate_rules.py`(注册一条规则)、`/meta/engine/orchestrator.yaml`(req 阶段接入规则)、`/meta/skills/requirement-understanding/SKILL.md` 与 `.agents` 副本(source 约定)。
- 新增:`targets/dsh/ontology/sources.yaml`(来源注册表)。
- 修正:`targets/dsh/artifacts/requirements/REQ-001..005.json` 的 `source`。
- 复用:既有引擎/校验/技能结构;不改 frame、不改四份 schema、不新增依赖。与 OpenSpec/任何 harness 解耦。
