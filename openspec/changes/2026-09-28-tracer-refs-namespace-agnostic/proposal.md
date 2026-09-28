## Why

文档审计轮(2026-09-28,补齐 eShop-demo 样例)发现一个既有工具缺陷:`meta/trace/tracer.py` 的 `refs` 子命令把概念查询硬编码为 `key.startswith("sp:")` —— `sp:` 是 dsh 目标项目的命名空间,被写死进了 meta 层工具。这违反本仓库自己的纪律:`openspec/specs/methodology/ontology-frame/spec.md` 明确"具体项目概念不得出现在 frame/元层,须活在每个目标项目的 instance 文件中"。后果:任何非 `sp:` 命名空间的目标(如教学样例 `docs/examples/eshop-demo` 的 `es:`)执行 `refs` 都返回空,与同一文件内 `verify`/`report`/`why` 的"instances.yaml 中解析即算"判据不一致。

## What Changes

- `refs` 的概念判定从 `key.startswith("sp:")` 改为 **`key in _instances(target)`**(在目标项目 `instances.yaml` 中解析即算概念)——与 `verify_target`/`coverage`/`why` 使用同一判据、同一数据源,彻底与命名空间解耦。
- `else` 分支(artifact id 查询,ADR 取代链)行为不变。
- 文档同步:`meta/trace/README.md` 与根 `README.md` 的 `refs` 示例由 `sp:<concept>` 改为 `<concept-id>`,并注明登记要求与 ADR-id 用法。

## Capabilities

无规格变更 —— `openspec/specs/methodology/traceability/spec.md` 的 "Reverse query" 需求(L34-39)本就要求"given a concept id … list every artifact that references that concept",从未绑定命名空间。本 change 是**代码-规格对齐**:修复实现违反既有规格的缺陷,故无 delta spec。

## Impact

- 修改:`/meta/trace/tracer.py`(`refs` 函数 1 处判定 + 注释)、`/meta/trace/README.md`(用法示例)、`/README.md`(命令表)。
- **不动**:四份 schema、frame、engine、gate_rules、`verify`/`report`/`why` 逻辑、任何 `targets/` 对象层产物。
- 行为变更面:此前"以 `sp:` 开头但未登记"的 key 会走概念分支返回空;现在走 artifact-id 分支同样返回空,输出不变;`es:` 等命名空间从"永远空"变为正确解析。
