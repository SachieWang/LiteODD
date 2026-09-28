## 1. 适配壳调用点迁移(两半逐段一致)

- [x] 1.1 `meta/integrations/dsh/bundle/lib/index.js`:`resolveRoot` 与 `runGateway` 的 `shell.run(shell.resolve(request))` 改为 `const handle = await shell.execute(shell.resolve(request)); const result = await handle.result()`;结果字段读取(`exitCode`/`stdout.text`/`stderr.text`)与错误消息文本不动。
- [x] 1.2 `meta/integrations/dsh/dynamic/methodology.host.js`:对应两段同步改写,与 bundle 半逐段一致(等价断言所钉)。
- [x] 1.3 确认 `bundle/shared/tools.core.js` 无 shell 调用、零改动。

## 2. 假 shell 模型修正与区分度断言

- [x] 2.1 `tests/verify-adapter.mjs` 假 shell:`resolve()` 返回补全 `onExpiry: 'kill'` / `stdoutMaxBytes` / `sandboxPolicy: undefined` / `signal: undefined` / `stdin: undefined` 的完整 `ShellExecSpec` 形状;删除 `run()`,新增 `execute(spec)` 返回带 `result()`(resolve 前台投影)与 `ShellProcess` 最小面(`status/exitCode/signal/done/readOutput/observed/kill`)的句柄。
- [x] 2.2 新增反向断言:构造只提供 `run` 的旧版假 shell 喂给两半 execute 路径,断言抛 TypeError 且命令未被记录——证明"回退旧 API 必炸"。
- [x] 2.3 等价断言集(`resolveRoot`/`runGateway` 主体段)在改写后仍逐段一致、且具备区分度(非恒真)。

## 3. 回归与验收

- [x] 3.1 `node meta/integrations/dsh/tests/verify-adapter.mjs` 全部通过(104 项既有 + 新增)。
- [x] 3.2 `node meta/integrations/dsh/tests/verify-adapter.mjs --full` 通过(真实 gateway 信封路径)。
- [x] 3.3 故意回退验证:临时把 bundle 半改回调 `shell.run` → verify-adapter 必须失败(2.2 断言生效)→ 还原。
- [x] 3.4 本机 DSH 实例(常驻 bundle link 安装)重启后,`methodology_status` 返回合法契约快照(实测验收,非推断)。

## 4. 文档

- [x] 4.1 `meta/integrations/dsh/README.md` §五排障表:删 shell API 过时行,补"工具抛 `shell.X is not a function` 类 TypeError = 宿主 shell 契约与适配壳不匹配,先跑 verify-adapter.mjs"。
- [x] 4.2 核对 README/STARTUP.md 中涉及 shell 调用形状的描述性语句,与新 API 一致。
