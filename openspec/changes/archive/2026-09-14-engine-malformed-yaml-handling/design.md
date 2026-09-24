## Context

真机事故:`sources.yaml` 的裸 `": "` 使 `realm_structure` 直接 `load_yaml` 崩栈,check.py 放行,引擎抛 40 行 uncaught traceback 而未点名文件/行号。动机见 proposal;行为要求见 delta spec。约束:不改 YAML 语义、不改既有闸门判定。

## Goals / Non-Goals

**Goals:**
- 非法对象层 YAML → **可读、定位的 gate FAIL**(点名文件 + 行 + 原因),不是调用栈。
- 引擎仍 `exit 1`(领域性失败),不复用 infra exit 2 语义。

**Non-Goals:**
- 不改变 YAML 合法时的任何解析/判定行为。
- 不改 `check.py` 的职责(它只校验 artifacts)。
- 不把非法输入当基础设施故障(仍 exit 1)。

## Decisions

1. **在 gate_rules 的 `load_yaml` 处集中保护**:新增一个受保护 wrapper,捕获 `yaml.YAMLError`(含 Scanner/Parser)与读取异常,返回错误;各闸门收到错误时把该文件记为 FAIL 并在消息里带上文件路径与行。
2. **点名文件 + 行 + 原因**:错误文本含 `文件: <path>`、`行: <line>`(若可得)、`原因: <message>`,让使用者直接定位。
3. **exit 仍 1**:格式非法是领域性失败(对象层数据不合规),不是网关/基础设施故障,不入 exit 2。
4. **覆盖面**:对象层三文件(`instances` / `components` / `sources`)的读取都经保护路径。

## Risks / Trade-offs

- [保护只盖一处,其它直调漏掉] → 排查所有 `load_yaml` 调用点,统一走 wrapper。
- [把合法内容误判为错] → wrapper 只捕获 YAML 解析/读取异常,不影响合法解析路径。

## Migration Plan

1. gate_rules 加受保护的 load_yaml wrapper 并替换直调。2. 负向验证:构造 malformed sources.yaml → engine 报可读 FAIL 且无 traceback,exit 1;恢复。3. 正向回归:bench/check 两目标 PASS。4. 同步主规格并归档。5. 回滚:单文件 + git。

## Open Questions

无。
