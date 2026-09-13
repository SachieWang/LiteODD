# DSH 插件启动方式指南 —— 方法论适配壳

本文是本适配壳在 **DeepSeek Harness (DSH)** 里以“插件”启动的唯一汇总说明。DSH 有两种**完全不同**的插件机制，必须区分清楚再选择；选错会得到“为什么我装了却没生效”的困惑。

## 一、DSH 的两种插件启动机制（先说清）

| | **A. 动态（运行时）** | **B. 静态 / 常驻（配置装载）** |
|---|---|---|
| 装载方式 | 会话内调 `cordis_define` → `cordis_run` | 把插件写成**模块**（`export function apply(ctx)`），在其 `cordis.yml` 里一行 `- name: <module>` 装载，loader 随进程启动 |
| 生命周期 | **会话级、进程内**；新会话/重启即消失 | **进程启动即装载、全会话可见**；随 preset/profile 分发 |
| 沙箱 | 代码是**纯 JS 函数体**，全局只有 `ctx`/`harness`/`console`…（`node:vm`） | 代码是**正常 ESM 模块**，可 `import { defineTool } from '@deepseek-ai/dsh-tools'` |
| 注册工具 | `harness.defineTool` + `harness.registerTool(ctx, t)`；UI 走 `harness.handle`→`host.call` | `ctx.tools.register(defineTool({...}))`（官方 `07-into-the-harness` 就是这个形状） |
| 需要什么 | 需要 **`cordis`（创造）preset** 才有 `cordis_*` 工具 | 需要能改 preset/`cordis.yml`、能重启 DSH |
| 适用 | 临时试用、一次会话内的实验 | “我要每天在 DSH 里用这套方法论”的日常形态 |

> 二者不是“两种语法换个写法”，是**两套运行面**。适配壳若要同时支持，就要维护两份形状（动态函数体 + 静态模块导出）——这正是本 change 把静态版**刻意留到后续**的原因（见 `README.md` 与 change 的 tasks 6.1），避免两份实现因无人验证而漂移。

## 二、本仓库当前交付支持哪种

**只支持 A（动态）**。`dynamic/methodology.host.js` / `methodology.client.js` 是动态函数体：host 半依赖沙箱 `harness` 注册工具与 RPC，client 半依赖 `tool.view.cordis` slot。

**B（静态）尚未交付能力**：要常驻装载，需要把 host 半改写成模块导出形态（`export function apply`，用 `ctx.tools.register(defineTool({...}))`），并决定 UI 半是否要独立 client 包。官方教程 `01-first-plugin` / `07-into-the-harness` 教会的就是这个形状，可作为改写底稿。

## 三、方式 A —— 会话内动态启动（已交付、已验证）

前置：当前会话使用 **`cordis`（创造）preset**。工作目录**不必**是方法论仓库根——适配壳会自己解析（见 [`README.md` 的「五之二、仓库根解析」](README.md)）；需要强制指定时给工具传 `repo`。

**完整逐步操作见 [`README.md` 的「三、动态装载」](README.md)——每一步明确“谁做、传什么、回什么”（含 payload→cordis_define 的衔接、cordis_run 的三种返回、授权与确认装载）。** 下面只是骨架：

```
1) cordis_inspect_list                       # 确认识别
2) cordis_inspect_query { platform:"host", provider:"Service", method:"listService", input:{service:"shell"} }
                                            # 确认 ctx.shell 已挂载(host 依赖 inject:['shell'])
3) python meta/integrations/dsh/dynamic/build_payload.py
                                            # 生成 define.payload.json;这是给 agent read 的文件,不是传文件名给 define
4) 交给 agent: read 该文件 → 把 plugin/name/purpose/code 三字段原样作为 cordis_define 内联入参
   # 返回 { pluginId, packageId };define 只校验+记录,不执行
5) cordis_run { pluginId, packageId, mode:"run" }
   # 返回 awaiting-approval(需授权)或 starting;不返回最终结果
6) (首次/含 client) 去页面授权 → 结束本轮等回报
7) 5 个工具 methodology_status/check/bench/judge/gate 出现在下一步工具表 → 调 method. status 确认
```

> ⚠ 最容易误解的一步是 4:`cordis_define` 只吃**内联值**，不吃文件名；payload 文件是供 agent 用读文件工具把它**原样搬进** `cordis_define` 的。

审批语义（DSH 既有规则）：页面**单勾**只授权当前 Package，**双勾**授权该插件后续版本；授权后 `starting` 并在浏览器异步完成。**不要在同一轮里等审批**，结束本轮等系统回报。

更新/回滚/停止/删除：`build_payload.py --existing <pluginId>` 生成**追加版本** payload → `cordis_define` → `cordis_run mode:"update"`；update 失败 → `mode:"update"` 重试 `nextPackageId`，或 `mode:"run"` 回滚 `currentPackageId`；`cordis_stop` 临时停用，`cordis_undefine` 永久删除。

详细排障见 `README.md` §五。

## 四、方式 B —— 静态常驻启动（DSH 官方机制，本适配待交付）

DSH 官方教程 `01-first-plugin.md` 演示的就是这条：写一个插件模块、在 `cordis.yml` 里装载、loader 启动。

最小形状（来自官方教程）：

```ts
// <plugin>.ts —— 方法论的常驻版要走这个形状(待实现),此例是官方 hello
import type { Context } from '@deepseek-ai/cordis'
export const name = 'methodology-adapter'
export function apply(ctx: Context) { /* ctx.tools.register(defineTool({...})) */ }
```

```yaml
# cordis.yml 中的一行(DSH preset/cordis.patch.yml 的 row 形态)
- id: methodology-adapter
  name: './path/to/plugin.ts'   # 相对路径或 npm 包名
```

两种分发方式：
- **preset**：把自己的 `cordis.yml` 放 `${DSH_HOME:-$HOME/.dsh}/.agent-presets/<id>/`（不要改部署自带 preset），重启装载；
- **bundle**：`package.json` 声明 `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`，用 `dsh plugin --profile <name> add <spec>` 加入 profile。

**为什么本轮没交付 B**：见 `meta/integrations/dsh/README.md` §七与 change 的 tasks 6.1——需要一个脱离沙箱的模块入口、一份装进真实 profile 后可真机验证的浏览器半装配、并在**仓库内无法端到端自证**的前提下避免产生第二份漂移实现。先做“只有 Host 半、无 UI”的最小模块验证后再补 UI。

## 五、官方文档位置（决定启动方式前先读）

| 主题 | 官方文档（DSH 源码树 `docs/`） |
|---|---|
| 静态装载/第一个插件 | `cordis-tutorial/01-first-plugin.md` |
| 静态形状里注册模型工具 | `cordis-tutorial/07-into-the-harness.md` |
| composition / HMR | `cordis-tutorial/06-composition-and-hmr.md` |
| Cordis 概念 | `cordis-primer.md` |
| 动态插件运行时 | `cordis` preset 自带技能 `cordis-plugin-development/SKILL.md`；`tool-catalog.md` 的 `cordis_*` 小节 |

> 这些官方文档在 DSH 源码仓库：`/home/sachiew/workspace/workspace-ai/deepseek-harness/docs/`。运行时装的是编译产物的副本，作者文档以源码树为准。
