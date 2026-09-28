## Why

方法论工具本体目前只有"git clone + 手动 `uv sync`"一种落地方式(README §快速上手),没有面向终端用户的一键安装。集成侧已由 DSH bundle 承担(通道无关分发,见 `bundle-distribution-form`),本体侧需要对称的落地通道:**安装脚本**,把"clone 到指定位置 + 依赖就绪 + 冒烟验证"收成一条命令。

两个分发单元刻意分离:DSH bundle 是 deepseek-harness 的接入入口(项目无关);本体安装是终端用户机器上的落地(uv + Python)。接口由 `verdict.schema.json`(v1.0)钉住,两边可各自演进。

## What Changes

- 新增 `/install.sh`(POSIX)与 `/install.ps1`(Windows PowerShell),放仓库根:
  - 探测 `git` / `uv`(缺失时给出官方安装指引,**不替用户装**);
  - `git clone --depth 1 --branch <tag>` 到 `--dest`(默认 `~/.local/share/ontology-methodology`;已存在则 `fetch + checkout + ff-only pull`);
  - `uv sync --project meta/scripts`;
  - 冒烟:`gateway.py snapshot` 输出合法 JSON 信封(`verdict.schema.json` 校验)即算装好;
  - 幂等:重复执行=更新到目标 tag,不破坏对象层(`targets/` 不动)。
- 安装方式:`curl -fsSL <raw>/install.sh | sh -s -- --version <tag> --dest <dir>`;私有仓库 raw 需 token,**git 通道(手动 clone 后本地跑脚本)为一等替代**而非回退。
- README §快速上手首行指向安装器,原手动步骤保留为"高级/离线"路径。
- **Windows 状态如实标注**:本体(uv+Python)装完可用;**DSH 适配壳的 RUNNER 是 POSIX 片段**,Windows 上 5 个工具会失败——文档明示,不在本 change 内修(独立 change)。

## Capabilities

### New Capabilities
<!-- 无:安装器是外挂交付物,不改五层契约 -->

### Modified Capabilities
<!-- 无 spec 级行为变更;README 属文档 -->

## Impact

- 新增:`/install.sh`、`/install.ps1`(仓库根,可 curl 的单文件)。
- 修改:`README.md`(快速上手首行)、`meta/integrations/README.md`(双通道分发一节)。
- 不修改:core、gateway.py、bundle、targets/。
- 说明:安装位置即工作位置——`targets/<project>/` 仍在安装目录内(对象层契约现状);"工具全局装、项目任意放"是另一演进项,不做进安装器。
