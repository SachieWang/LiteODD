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

> 二者不是“两种语法换个写法”，是**两套运行面**。适配壳同时维护两份形状（动态函数体 + 静态模块导出），由 `verify-adapter.mjs` 的逐段等价断言强制一致，不会漂移（见 `README.md` §七“常驻化”）。

## 二、本仓库当前交付支持哪种

**A（动态）与 B（静态常驻）的第一步（Host-only）均已交付**：

- **A 动态**:`dynamic/methodology.host.js` / `methodology.client.js` 是动态函数体:host 半依赖沙箱 `harness` 注册工具与 RPC,client 半依赖 `tool.view.cordis` slot;
- **B 静态常驻**:`bundle/` 是可安装的 npm bundle(包名 `dsh-methodology-adapter`),进程启动即装载 5 个 `methodology_*` 工具(见 §四)。

**B 的第二步（浏览器半的卡片 UI）尚未交付**：常驻形态没有 `host.call` 消费者，面板仍由动态插件承担，待需要时再议。

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

## 四、方式 B —— 静态常驻启动(Host-only 第一步已交付)

DSH 官方教程 `01-first-plugin.md` / `07-into-the-harness.md` 教的就是这条。**第一步(Host-only)已交付**: `/meta/integrations/dsh/bundle/` 是一个可安装的 npm bundle,进程启动即装载 5 个 `methodology_*` 工具,无需 `cordis_define`/`cordis_run`。

最小形状(官方教程形态,与已交付实现一致):

```ts
// bundle/lib/index.js —— ESM 静态插件
import { defineTool } from '@deepseek-ai/dsh-tools'
export const name = 'methodology-adapter'
export const inject = ['tools', 'shell']
export function apply(ctx) { ctx.tools.register(defineTool({ ... })) }
```

安装(两种通道,**同一份 patch** 均正确——插件行按包名 `dsh-methodology-adapter` 引用):

```sh
# 开发(link):装的是指向仓库内 bundle/ 的软链,移动/删除仓库即失效——只用于本仓库开发
dsh plugin --profile <name> add ./meta/integrations/dsh/bundle

# 分发(git spec):代码拷进 profile 的 pnpm store,与源目录彻底解耦,换机可迁移
dsh plugin --profile <name> add <git-url>#<tag>

# 分发(npm,发布后):同上,registry 通道
dsh plugin --profile <name> add dsh-methodology-adapter
```

```sh
dsh --profile <name> --dump-config        # 应出现 "# == dsh-methodology-adapter" 层
dsh --profile <name> "<任务>"             # 启动日志出现 "active: 5 tools"
dsh plugin --profile <name> remove dsh-methodology-adapter
```

与动态版的关系:**同一份共享源**(`bundle/shared/tools.core.js` = 动态半对应段),由 `verify-adapter.mjs` 的等价断言强制一致,不会漂移。**差异只允许是包裹方式**:动态半走沙箱 `harness.defineTool`(raw 参数根),静态走 `ctx.tools.register(defineTool(...))`(DSL 参数根、属性级 `required`)。**第二步(浏览器半的卡片 UI)未交付**——常驻形态不注册 `host.call` RPC,面板仍由动态插件承担。

两种分发方式：
- **preset**：把自己的 `cordis.yml` 放 `${DSH_HOME:-$HOME/.dsh}/.agent-presets/<id>/`（不要改部署自带 preset），重启装载；
- **bundle**：`package.json` 声明 `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`，用 `dsh plugin --profile <name> add <spec>` 加入 profile。

**两步交付的当前状态**:第一步(Host-only bundle)已交付并真机验证——一次性 profile 安装、`--dump-config` 出层、启动日志出现 `active: 5 tools`(change `add-resident-bundle`);漂移风险由共享源 + `verify-adapter.mjs` 等价断言(104 项)钉住。第二步(浏览器半的卡片 UI)未交付:常驻形态没有 `host.call` 消费者,面板仍由动态插件承担,待需要时再议。

## 五、官方文档位置（决定启动方式前先读）

| 主题 | 官方文档（DSH 源码树 `docs/`） |
|---|---|
| 静态装载/第一个插件 | `cordis-tutorial/01-first-plugin.md` |
| 静态形状里注册模型工具 | `cordis-tutorial/07-into-the-harness.md` |
| composition / HMR | `cordis-tutorial/06-composition-and-hmr.md` |
| Cordis 概念 | `cordis-primer.md` |
| 动态插件运行时 | `cordis` preset 自带技能 `cordis-plugin-development/SKILL.md`；`tool-catalog.md` 的 `cordis_*` 小节 |

> 这些官方文档在 DSH 源码仓库：`/home/sachiew/workspace/workspace-ai/deepseek-harness/docs/`。运行时装的是编译产物的副本，作者文档以源码树为准。
