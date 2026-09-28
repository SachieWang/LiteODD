## 1. 脚本

- [x] 1.1 `/install.sh`(POSIX,~85 行):`--repo/--version/--dest`(默认 `~/.local/share/ontology-methodology`,可用 `METHODOLOGY_INSTALL_DEST` 覆盖);探测 git/uv(缺则指路并退非零);clone --depth 1 --branch / 已存在则 fetch+checkout+ff-only(diverge 拒绝,不 reset);`uv sync`;冒烟 = snapshot 输出过 verdict.schema.json Draft-07 校验;全程不触碰 `targets/`。
- [x] 1.2 `/install.ps1`(PowerShell):同逻辑同参数(`-Repo/-Version/-Dest`);cmd 用户经 `powershell -File` 走此脚本,不做第三份。
- [x] 1.3 两个脚本的成功输出末行均含 Windows 现状提示(DSH 工具的 RUNNER 为 POSIX,本体可用、DSH 工具暂不可用)。

## 2. 验证(本机实测)

- [x] 2.1 全新安装到 `/tmp/mthd-install-test`:clone → uv sync → 冒烟出合法信封,exit 0。
- [x] 2.2 幂等:对同一 dest 重复执行=fetch+ff-only;`targets/sentinel-probe/keepme.txt` 哨兵在重复执行后**原样保留**,exit 0。
- [x] 2.3 失败路径:不存在的 tag → `[install] 失败: clone 失败` 明确报错,exit 1。
- [x] 2.4 冒烟校验真实生效:以不合规信封喂校验器 → 点名违规(`'target' is a required property` 等)并 exit 1。
- 注:测试临时目录的 `rm -rf /tmp/...` 清理被自动审批锁定类拦截(非用户否决,不可绕过);目录在 `/tmp` 随重启自清,不影响交付。

## 3. 文档

- [x] 3.1 `README.md` 快速上手:首节改为"一键安装"(curl-pipe-sh / PowerShell / 私有仓库 git 通道),含默认落点与 Windows 状态;原手动步骤降为"手动/离线(高级路径)"并注明安装器内部即此逻辑。
- [x] 3.2 `meta/integrations/README.md`:新增"§九 双通道分发"(两单元角色/安装/版本锚对照,单源与不拆仓的理由,bundle 项目无关与本体 harness 无关的互不依赖);原§九种子集顺延为§十。
