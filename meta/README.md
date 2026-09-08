# /meta — 方法论工具体系(元层)

本目录存放**方法论的产物**:通用、可复用、随方法自身演进的规则与工具。它们**不**属于任何一个目标项目。

| 子目录 | 内容 |
|---|---|
| `ontology/frame.yaml` | 元层通用本体类型:7 概念类型 + 8 关系 + 轻属性 + `instantiateOf` 分离规则 |
| `metaschema/*.schema.json` | 四份 artifact 元模型:requirement / adr / arch-report / domain-model |
| `scripts/` | 单一合规校验脚本(uv + Python) |

## 放置规则(必须遵守)

**元层产物只进本目录;目标项目产物必须进 `/targets/<project>/`,严禁混放。**

- 元层 = 通用/可复用:本体**类型**、schema、技能、工作流、方法论内部变更。
- 对象层 = 项目专属:项目本体**实例**、组件索引、ADR/报告/领域模型/需求。
- 连接只用三个抓手,不带额外系统:
  1. `instantiateOf`  — 项目实例 → 本目录 frame 的类型
  2. `conceptRef`     — 项目产物 → 项目实例(在本体内解析)
  3. `meta.schemaVersion` — 元层版本化,追踪本方法自身的演进

> 若在 frame 中看到项目专用词(如 capability-seam、turn),视为不合规——那些是实例,不属本层。
