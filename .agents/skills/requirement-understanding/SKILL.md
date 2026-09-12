---
name: methodology-requirement-understanding
description: 需求理解技能——把原始需求/访谈纪要/愿景转成结构化、本体对齐、可验证的需求集,输出遵循 requirement.schema.json 并经校验脚本过质量门。当用户想用这套方法论把原始需求结构化、或产出可追溯的需求条目时使用。
metadata:
  author: methodology-layer1
  version: "1.0"
  realm: meta
---

# 需求理解技能 (Requirement Understanding)

本技能把**原始需求/访谈纪要/愿景**转成**结构化需求集**,强制与 Layer 0(本体/元模型)对接,保证不同项目、不同 agent、不同时刻产出同构。

> 前提:目标项目已有实例层(如 `/targets/<project>/ontology/instances.yaml` 与 `components.yaml`);元层有 `/meta/ontology/frame.yaml`、`/meta/metaschema/*.schema.json`、`/meta/scripts/check.py`。

## 触发条件 Trigger

- 收到原始需求描述、访谈纪要、愿景说明,需要转成结构化需求条目;或
- 需要为后续架构评估/领域建模产出一份**可追溯**的需求基线。

## 输入 Schema Input

- `raw` : 原始需求文本(访谈纪要 / 文档 / 愿景)。
- `project` : 目标项目(**运行时提供,无默认目标**),以读取 `ontology/instances.yaml`。
- 可选:`scope`(关注范围)、`source`(**须为可解析引用**,见输出约定;不得自由文本)。

## 步骤 Steps

1. **先对齐本体**:读取 `frame.yaml`(类型)与目标项目 `instances.yaml`(实例),把 `raw` 里的领域词映射到可解析的实例 `conceptRef`(如 `sp:<concept>`)。映射不到就用 `??` 标注待定,不臆造。
2. **拆需求**:把原始输入拆成**单一关注点**的需求条目(一条一义)。
3. **标注不确定性**:标记缺失范围、术语无法解析、相互矛盾之处为 flagged uncertainty,不静默猜测。
4. **来源对齐(可校验)**:为每条需求确定 `source`,且**必须**落成可机器校验的形态:
   - `file:<仓库相对路径>`(该文件须真实存在);或
   - 目标项目 `ontology/sources.yaml` 中登记的来源 id。
   若来源无对应文件(如访谈口头/某会话),**在 `sources.yaml` 登记一条**并说明,不得编造自由文本。
5. **可验证性回查**:每条需求补上**可验证的验收准则(acceptance criteria)**。
6. **过质量门**:产出后运行校验(见下方质量门)。

## 输出 Schema Output

- 一个 JSON 数组,每条遵循 `/meta/metaschema/requirement.schema.json`:
  `{ requirement: { id, title, source, conceptRef[], type?(functional|quality|constraint), acceptanceCriteria[], priority?, status?, meta:{schemaVersion} } }`。
- 每条 `conceptRef` 必须在项目 `instances.yaml` 内解析。
- `source` **必须可机器校验**:`file:<存在的相对路径>` 或 `ontology/sources.yaml` 中登记的 id;自由文本**不合规**(由闸门规则 `provenance_resolvable` 强制)。

## 质量门 Quality Gate

- 运行 `uv run --project meta/scripts python meta/scripts/check.py <project>`(如 `targets/<project>`),对该项目 artifacts 内所有需求条目执行三段不变量:1) `meta.schemaVersion` 存在;2) 结构/枚举合法(符合 requirement schema);3) 所有 `conceptRef` 可解析。
- 另做**语义对齐抽查**:每条需求必须有非空 `acceptanceCriteria` 与可解析 `conceptRef`,否则该条**不释放**。
- **来源可解析校验**(闸门规则 `provenance_resolvable`):`source` 必须是存在的 `file:` 路径或已登记来源 id,否则该条**不释放**——杜绝伪溯源。
- 未过质量门的需求条目不得作为基线进入后续架构评估/领域建模。

> 方法库/反模式(轻量提示):缺验收准则→可验证性缺失;词无法落到实例→术语未对齐,先补本体或标注待定。
