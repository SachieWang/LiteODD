## Why

F 的 G5(真机事故):`targets/plant-maint/ontology/sources.yaml` 的 `note` 里一个裸 `": "` 让 YAML 解析失败。`check.py` **放行了**(它只校验 artifacts),而 `realm_structure` 闸门直接 `load_yaml` → **未捕获的 Python 栈穿透到顶层**(engine exit=1 + 长达 40 行的 traceback),**没有点名是哪个文件、第几行、什么原因**。

这与确定性引擎应有的行为相悖:非法输入应得到**可读、定位的 gate FAIL**,而不是调用栈。

## What Changes

- 在 `gate_rules.py` 的 `load_yaml` 调用处加**受保护的解析**:捕获 `yaml.ScannerError` / `ParserError` / 读取异常,转成 gate 错误,点名**文件 + 行 + 原因**。
- 引擎仍 `exit 1`(领域性失败),但**不泄露 uncaught traceback**。
- 同类 `load_yaml` 直调(对象层三文件)一并保护。

## Capabilities

### Modified Capabilities
- `methodology/orchestration`:新增「格式非法对象层 YAML 报可读错误」要求。

## Impact

- 修改:`/meta/engine/gate_rules.py`(load_yaml 加错误处理)。
- **不动**:YAML 语义、既有闸门判定逻辑、`check.py` 的校验职责、任何目标产物。
