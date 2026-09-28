## 1. 分发形态

- [ ] 1.1 `bundle/cordis.patch.yml` 插件行 `name` 改为 `'dsh-methodology-adapter'`(包名);verify YAML 可解析。
- [ ] 1.2 `bundle/lib/index.js` 与 `dynamic/methodology.host.js` 的 `resolveRoot` 失败报错同步补一句指引(先装本体,再以 `repo:` 指向);verify 等价断言仍全绿(两处文案一致)。
- [ ] 1.3 `verify-adapter.mjs` 的 patch 行断言由 `./lib/index.js` 改为包名;全量跑绿。

## 2. 真机验证(通道无关)

- [ ] 2.1 清理上轮一次性 profile `mthd-verify`(`dsh plugin --profile mthd-verify remove dsh-methodology-adapter`,授权已给)。
- [ ] 2.2 以新 patch 行重新 link 安装并验证:`--dump-config` 出层 + one-shot 启动日志 `active: 5 tools`。
- [ ] 2.3 (可选)在第二个路径 clone 本仓库,以 `dsh plugin --profile <n> add <clone-url>#<tag>` 验证 git spec 通道;不属硬验收。

## 3. 文档

- [ ] 3.1 `STARTUP.md` §四、`dsh/README.md` §七:补 git spec 形态安装命令;写明 link(开发绑定)与 git/npm(路径无关拷贝)的差异。
- [ ] 3.2 `meta/integrations/README.md` §四 B 行状态补"分发形态通道无关"。
