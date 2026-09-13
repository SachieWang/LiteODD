## 1. 网关(harness 无关)

- [x] 1.1 Create `/meta/integrations/gateway.py` with `snapshot|check|bench|judge|gate`: stdout 恰好一个 JSON 信封、stderr 人读日志、exit `0/1/2`;子命令一律 subprocess 调 core 脚本,只用 exit code 作判决,并把 judge 的 `ok[N]`/`FAIL[N]` 原样结构化为 `conditions{record,bench,addonly}`;为子进程设 `UV_CACHE_DIR`/`UV_PYTHON_INSTALL_DIR` 到仓库内;verify `snapshot`/`judge`(accept/reject)跑通且退出码正确。
- [x] 1.2 Verify `gate --target targets/dsh --candidate meta/evolution/retro/accept-example.yaml`: steps 为 `bench.py`(detail 含 `check.py: PASS` / `engine: PASS`)与 `judge.py`,整体 exit `0`。
- [x] 1.3 新增 `/meta/integrations/schemas/verdict.schema.json`(Draft-07,版本化),并用 `Draft7Validator` 验证 `snapshot`、`judge` accept、`judge` reject、缺失候选(exit 2)四个信封全部通过。

## 2. DSH 适配壳

- [x] 2.1 新增 `/meta/integrations/dsh/dynamic/methodology.host.js`(纯 JS 函数体):`inject: ['shell']`,注册 `methodology_status|check|bench|judge|gate` 五个工具 + `snapshot|judge|gate` 三个 `harness.handle` RPC;命令优先走 `meta/scripts/.venv/bin/python`,回落 `uv run`,并把 `UV_*` 指到 `$PWD`。
- [x] 2.2 新增 `/meta/integrations/dsh/dynamic/methodology.client.js`(纯 JS 函数体):在 keyed slot `tool.view.cordis` 以 `key: 'self'` 注册面板,通过 `host.call` 取快照 / 触发 judge 与 gate,并用 `styles.insert` 持有自有样式。
- [x] 2.3 新增 `/meta/integrations/dsh/dynamic/build_payload.py`:由两个 JS 源生成 `cordis_define` 合法入参(默认 `define.payload.json`,git 忽略;`--existing <pluginId>` 支持追加版本);verify 产物键集与 `plugin.kind=existing` 切换正确。
- [x] 2.4 修正并钉住宿主契约(本轮由自检抓出的两个真 bug):`parameters` 的 raw object 根**不得**用属性级 `required`(必填只写根 `required` 数组);`output.schema` 的 object 节点必须显式 `additionalProperties`,必填写成属性级 `required: true`。

- [x] 2.5 修正真机(DSH 会话内动态装载)暴露的第三个 bug:host 半原先依赖 shell 的**隐式工作目录**,而动态包的 `shell.run` 默认 cwd **不保证**等于会话工作区,于是 `uv` 报 `Project directory \`meta/scripts\` does not exist`、网关根本没跑起来。这个 bug 自检与 CLI 都发现不了:前者假 shell 对任何命令都回放固定信封,后者由人 `cd` 到仓库根。改为**显式解析仓库根**(工具参数 `repo` → `shell.resolve()` 暴露的默认 workdir → `workspaceRegistry` 已注册工作区),候选在一次 shell 往返里用 `[ -f <cand>/meta/integrations/gateway.py ]` 判定,并把 `workdir` 与 `cd` 一起钉死在解析结果上;解析失败时报出候选清单与 `repo` 用法。`methodology_status` 的 `root` 字段回显本次解析结果,便于一眼确认没跑错目录。

## 3. 触发面(技能)

- [x] 3.1 新增 `skills/methodology-gate/SKILL.md`(源):状态 → 回归 → 判定 → 只在通过时发起 change;含失败条件整改清单与"壳不裁决/网关不吸收"边界。
- [x] 3.2 新增 `skills/methodology-capture-retro/SKILL.md`(源):按 `meta/evolution/retro.md` 七字段把复盘写成候选 YAML,强调 change 记录须真实存在、add-only 判定、吸收不由捕获决定。
- [x] 3.3 同步副本到 `/.agents/skills/methodology-gate/SKILL.md` 与 `/.agents/skills/methodology-capture-retro/SKILL.md`;verify 副本与源逐字节一致,且 DSH 会话技能目录已收录两者。

## 4. 验证

- [x] 4.1 新增 `/meta/integrations/dsh/tests/verify-adapter.mjs`:用 DSH 自带校验器(`parameterSchemaSpecToJsonSchema`/`valueSchemaSpecToJsonSchema`/`assertSupportedJsonSchema`/`validateJsonSchemaValue`)做宿主契约回归;host 半在 `node:vm` + `(async () => {…})()` 中求值,client 半用真实闭包符号表求值。
- [x] 4.2 `node meta/integrations/dsh/tests/verify-adapter.mjs` 全绿(84 项断言)。含 2.5 的回归:假 shell 现在建模"默认 cwd 可能不是仓库根"(按命令里**实际写出的候选列表**作答),用例把默认 cwd 设成不存在的目录后仍须解析出仓库根、仍须钉住 `workdir`、且探测只走一次往返;另有用例确认显式 `repo` 跳过探测。
- [x] 4.3 `node meta/integrations/dsh/tests/verify-adapter.mjs --full` 全绿(追加真实 `bench` / `gate` 信封与 6 条 execute 用例)。
- [x] 4.4 回归核心:`uv run --project meta/scripts python meta/evolution/bench.py targets/dsh` 与 `check.py targets/dsh` 均 PASS(经 `gateway.py gate` 验证)。

## 5. 文档

- [x] 5.1 新增 `/meta/integrations/README.md`:适配层定位、三条红线、目录结构、六面映射、输出契约、命令参考、验证方式、非目标。
- [x] 5.2 新增 `/meta/integrations/dsh/README.md`:DSH 事实依据、三个接线点、工具清单、装载步骤(含 `cordis_inspect_query` 先查后写与审批语义)、更新/回滚、排障表、契约自检,以及常驻化的下一步。
- [x] 5.3 更新根 `README.md` 与 `docs/architecture.md`:把集成适配层作为**外挂层**记录(不并入五层编号),指向本目录。

## 6. 后续(本 change 不交付)

- [ ] 6.1 常驻化:最小 Host-only `dsh.bundle`(package.json 的 `dsh.bundle.patch` + `cordis.patch.yml` + `dsh plugin --profile add`),先在真实 profile 验证 `ctx.tools.register` 与 `ctx.shell`,再补 RPC 与卡片 UI。
- [ ] 6.2 事件面接线:先在本地接(会话结束 / pre-commit 钩子以 `gateway.py gate` 为唯一入口);CI 接线**受阻于种子集策略**——`targets/` 被 git 忽略,CI 无种子可回归,需先决定种子集版本化方式(独立最小种子仓 / 子模块 / 从工件仓拉取),再谈 CI 门。
