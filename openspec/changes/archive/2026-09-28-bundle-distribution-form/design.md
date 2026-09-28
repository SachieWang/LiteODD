## Context

bundle 已交付但 patch 行是相对路径(开发/link 形态)。官方 publish.md 明示发布形态用包名引用。约束:add-only、不造第二份 patch、不改共享源逻辑。

## Goals / Non-Goals

**Goals:**
- 一份 `cordis.patch.yml` 同时正确服务 link 安装与 git/npm 安装(包名引用)。
- "本体未装"时报错给出可执行的下一步。
- 文档写清两通道差异,防止把 link 当分发。

**Non-Goals:**
- 不交付 npm 发布流程(公开与否是使用侧决策)。
- 不动 gateway.py / core / 共享源逻辑(报错文案除外)。
- 不做 target 全局发现 / METHODOLOGY_ROOT(另一演进项)。

## Decisions

1. **包名引用替代相对路径**:`name: 'dsh-methodology-adapter'`。依据 publish.md:link 安装把包链进 profile 的 node_modules,包名解析成立;git/npm 安装拷进 pnpm store,包名解析同样成立。**一份 patch,零通道分支**。
2. **报错指引进共享文案,两形态同步**:resolveRoot 失败提示加"先安装本体(见仓库 README)/install 脚本,再以 repo: 指向该安装"。改 `tools.core.js` 不行(该函数在 lib 与动态半各有一份、由等价断言钉住)——所以**两处同步改**,等价断言继续保证一致。
3. **verify-adapter 的 patch 行断言随行更新**:从"含 `./lib/index.js`"改为"含包名"。等价断言范围不变(报错文案变化会被断言抓出来,必须两处一起改才绿——这正是想要的)。

## Risks / Trade-offs

- [包名解析在冷 profile 失败] → 与官方教程同形态;安装后 `--dump-config` 验证出层即证。
- [有人误把 link 当分发] → 文档明确"link=开发绑定,移动/删除仓库即失效;分发用 git spec/npm"。

## Migration Plan

1. 改 patch 行。2. 两处报错文案同步。3. verify-adapter 断言更新并跑绿。4. 一次性 profile 重装验证(先 remove 旧 link,再 add)。5. 文档。6. 回滚:单文件×3 + git。

## Open Questions

无。
