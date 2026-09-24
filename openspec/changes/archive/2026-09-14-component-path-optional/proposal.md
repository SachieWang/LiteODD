## Why

F 的 G4:`components.yaml` 的 `path` 字段**假定代码路径**——模板写成 `path: "<代码路径,如 packages/<group> 或 src/<module>>"`,但非软件领域的组件**没有代码路径**;`targets/plant-maint` 只能用"逻辑归属定位符"(如 `shopfloor/line-a`)硬填,属语义拉伸。

注意:主规格「Components file minimal shape」只要求条目带 **`ref`**,`path` 在规范层面**本就不是必填**——不一致出在**模板**把 `path` 写成必填代码路径。

## What Changes

- 模板 `components.template.yaml` 把 `path` 改为**可选**,并注明语义:「代码路径;非软件领域可用**逻辑定位符**或省略」。
- 复核 `realm_structure` 闸门:若它在读 `path`,放宽为可选(属本 change 契约内);确认 **`ref` 仍是唯一必填**。
- 主规格:给 Components 要求补充「`path` 可选」的说明。

## Capabilities

### Modified Capabilities
- `methodology/object-realm-contract`:补充 components 条目 `path` 可选的说明。

## Impact

- 修改:`/meta/templates/components.template.yaml`(path 可选 + 语义说明)、`/meta/engine/`(若 realm_structure 读 path 则放宽)、主规格。
- **不动**:`instances.yaml` / `sources.yaml` 契约、四份 schema、任何目标产物(现有 dsh/plant-maint 已填的 path 不用改)。
