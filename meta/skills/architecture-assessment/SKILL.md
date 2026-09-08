---
name: methodology-architecture-assessment
description: 架构分析/评估/改进技能——把需求集 + 存量架构转成架构评估报告与 ADR,输出遵循 arch-report.schema.json / adr.schema.json 并经校验脚本过质量门。当用户想用这套方法论评估/改进架构体系、给出演进建议时使用。
metadata:
  author: methodology-layer1
  version: "1.0"
  realm: meta
---

# 架构分析/评估/改进技能 (Architecture Assessment)

本技能把**需求集 + 现状架构**转成**架构评估报告 + ADR**,强制对接 Layer 0 脊柱(可追溯/可评估),保证评估对象都能定位到实例并形成决策链。

> 前提:目标项目已有 `instances.yaml` 与 `components.yaml`(组件薄索引);元层有 frame、四 metaschema 与 `check.py`。

## 触发条件 Trigger

- 需要对存量系统做分析梳理(如 deepseek-harness),评估现有架构;或
- 拿到需求集后,需要评估现状架构能否满足、并给出演进建议;或
- 做一个架构决策需要留 ADR 轨迹。

## 输入 Schema Input

- `requirements` : 需求集(来自需求理解技能,已带 `conceptRef`)。
- `project` : 目标项目,读取 `ontology/instances.yaml` 与 `components.yaml`。
- `source` : 现状代码/架构(路径或说明,供测绘)。

## 步骤 Steps

1. **先对齐本体**:读取 frame 与项目 instances/components,确立可评估的组件/能力缝集合。
2. **质量属性映射**:从需求抽象出质量属性(可替换性/可追溯性/性能/...),建立 需求→组件 关联。
3. **模块/运行时视图测绘**:对照 `components.yaml`,给出 module 视图与 runtime 视图。
4. **差距分析**:现状 vs 需求,列出 gap(每条 gap 标注关联实例)。
5. **演进建议**:给出 recommendations。
6. **决策留痕**:对评估中做出的架构决策写 ADR。
7. **过质量门**:运行校验(见质量门)。

## 输出 Schema Output

- 一份 `arch-report`,遵循 `/meta/metaschema/arch-report.schema.json`:
  `{ report: { id, targetRef, qualityAttributes[], views[], assessments[], recommendations[], conceptRef[], meta:{schemaVersion} } }`。
- 若干份 `adr`,遵循 `/meta/metaschema/adr.schema.json`:
  `{ adr: { id, date, status(proposed|accepted|superseded), context, decision, rationale, alternatives?, conceptRef[], supersedes[], meta:{schemaVersion} } }`。
- `targetRef` / 所有 `conceptRef` 必须在项目 `instances.yaml` 内解析。

## 质量门 Quality Gate

- 运行 `uv run --project meta/scripts python meta/scripts/check.py <project>`,校验 `arch-report` 与 `adr`:三段不变量 + `targetRef`/`conceptRef` 解析;ADR 的 `status` 枚举合法、`supersedes` 形成决策链。
- **语义抽查**：报告必须含质量属性、视图与差距/建议;评估对象必须有可解析 `targetRef`,否则报告**不释放**。

> 方法库/反模式:无法定位到实例的评估对象→未对齐本体;只有结论无差距/建议→评估不完整;决策无 ADR→不可追溯。
