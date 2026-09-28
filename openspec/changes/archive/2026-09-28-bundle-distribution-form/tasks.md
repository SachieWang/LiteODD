## 1. 分发形态

- [x] 1.1 `bundle/cordis.patch.yml` 插件行 `name` 改为 `'dsh-methodology-adapter'`(包名,官方 publish 形态);头部注释写明两通道与绑定语义;verify YAML 可解析。
- [x] 1.2 `bundle/lib/index.js` 与 `dynamic/methodology.host.js` 的 `resolveRoot` 失败报错**同步**改为"请先安装方法论工具本体(clone 仓库或运行其 install 脚本),再以 repo 参数显式指定该安装位置";verify 等价断言仍全绿(104 项)——两处文案一致由 resolveRoot 等价断言直接覆盖。
- [x] 1.3 `verify-adapter.mjs` patch 行断言改为"含包名且**不含** `./lib/index.js`";全量 104 项 ALL PASS。

## 2. 真机验证(通道无关)

- [x] 2.1 清理上轮 link 安装(`dsh plugin --profile mthd-verify remove dsh-methodology-adapter`)。
- [x] 2.2 以包名 patch 行重新 link 安装:`--dump-config` 出层且行为 `name: dsh-methodology-adapter`(不再是 file:// 绝对路径);one-shot 启动日志 `active: 5 tools`。
- [ ] 2.3 (可选)第二路径 clone + git spec 通道验证;不属硬验收,未执行。

## 3. 文档

- [x] 3.1 `STARTUP.md` §四:两通道安装命令并列;写明 link=开发绑定(移动/删除仓库即失效)、git spec/npm=拷进 pnpm store 与源目录解耦。
- [x] 3.2 `dsh/README.md` §七:安装一节改为通道无关三形态;验证记录补"link 与包名两种 patch 形态均实测"。
- 注:`meta/integrations/README.md` §四 B 行的"双形态"表述已在上轮覆盖,本轮无需再动。
