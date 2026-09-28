## 1. 脚本

- [ ] 1.1 `/install.sh`(POSIX):参数 `--repo <url>` `--version <tag>` `--dest <dir>`(默认 `~/.local/share/ontology-methodology`);探测 git/uv(缺则指路并退非零);clone --depth 1 --branch / 已存在则 fetch+checkout+ff-only;`uv sync --project meta/scripts`;冒烟 = `gateway.py snapshot` 输出过 verdict.schema.json 校验;全程不触碰 `targets/`。
- [ ] 1.2 `/install.ps1`(PowerShell):与 1.1 同逻辑同参数;`cmd` 用户经 `powershell -File` 走此脚本。
- [ ] 1.3 安装器输出含一行 Windows 现状提示(DSH 工具的 RUNNER 为 POSIX,Windows 上本体可用、DSH 工具暂不可用)。

## 2. 验证(本机实测)

- [ ] 2.1 全新安装到临时 dest:clone → uv sync → 冒烟出合法信封,退出 0。
- [ ] 2.2 幂等:对同一 dest 重复执行=fetch+checkout+ff-only,`targets/` 未被触碰(放一个哨兵文件验证),退出 0。
- [ ] 2.3 失败路径:给一个不存在的 tag → 明确报错退出非零,目录保留。
- [ ] 2.4 冒烟校验真实生效:临时让 snapshot 输出非法(如截断)→ 安装器判失败(以等价方式模拟,不改仓库)。

## 3. 文档

- [ ] 3.1 `README.md` 快速上手首行指向安装器(curl|sh 与 git 通道并列);手动步骤降为"离线/高级"。
- [ ] 3.2 `meta/integrations/README.md`:新增"双通道分发"一节——DSH bundle(接入入口,通道无关)与本体安装器(终端落地)各自职责与互不依赖。
