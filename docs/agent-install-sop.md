# LiteODD 方法论工具体系 —— Agent 安装配置 SOP

> **读者**：AI agent（DSH 会话内的助手）。用户会以一句话请求"安装/配置 LiteODD 工具体系"，你的职责是安全、幂等地完成安装与配置，不制造重复安装、不破坏既有安装与其他项目的对象层数据。
> **人类口令**：`安装 LiteODD 并为 <项目名> 配置本体`
> **v0.2.0 起适用**（依赖 repo.conf R1 兜底解析；v0.1.0 无此机制）。

## 0. 术语与心智模型（先读懂再动手）

| 术语 | 含义 | 位置 |
|---|---|---|
| **开发 clone** | LiteODD 仓库的开发副本（你在其中工作的这个仓库） | `~/workspace/workspace-ai/OntologyDrivedDesignSystem/` |
| **全局安装** | 供全机所有项目共用的本体运行时（install.sh 的默认落点） | `~/.local/share/ontology-methodology/` |
| **DSH profile** | DSH 配置档（本机为 `web`） | `~/.dsh/profiles/<name>/` |
| **常驻 bundle** | DSH 插件实体（npm 包 `dsh-methodology-adapter`），进程启动即装载 5 个 `methodology_*` 工具 | profile 依赖 + pnpm store 拷贝 |
| **repo.conf** | 机器级登记文件，适配壳仓库根解析的第 4 层兜底 | `~/.config/ontology-methodology/repo.conf` |
| **target** | 一个开发项目在本体仓库内的对象层投影（本体三件套 + artifacts + evolution） | `<本体仓库>/targets/<project>/` |

**关键心智模型**：
1. **一个本体仓库服务 N 个项目**：工具体系（meta/）与项目对象层（targets/<project>/）分离——本体是"公共工具体系仓"，项目私有本体知识（本体实例、ADR、领域模型、复盘）各归各的 target 子目录，互不干扰。
2. **全局安装是"服务地址"**：`methodology_*` 工具通过 repo.conf 兜底解析到全局安装（或显式 `repo:` 参数），它就是多项目共享的服务器；**为项目配置 ≠ 再装一份本体**。
3. **DSH 插件与本体运行时是两个独立平面**：
   - 插件（bundle）装进 profile，是**调用面**（工具注册）；
   - 本体（仓库+venv）装在文件系统，是**执行面**（真正干活的 gateway.py + core 脚本）。
   - 两者版本解耦但有对应关系：bundle v0.1.0 需本体 ≥ v0.1.0。
4. **两个平面都可独立更新**：`dsh plugin remove/add` 换 bundle 版本（调用面）；`install.sh` 升级本体（执行面）；互不牵连但应保持版本对齐。

## 1. 总流程图

```
用户一句话请求
      │
      ▼
[P1] 预检(只读) ──已装且版本够新──▶ [P4] 仅为项目初始化 target(增量、幂等)
      │                                    │
      │ 未装/版本旧                        ▼
      ▼                              [P5] 验证与交付总结
[P2] 安装本体到全局(幂等) ──▶ [P3] 安装 DSH 插件(如 profile 未装/旧)
```

## 2. P1 预检（只读，无副作用）

按顺序检查，**任何一步已满足即跳过对应安装**（这正是避免重复安装的核心）：

```bash
# a) 本体已装?版本?
test -d ~/.local/share/ontology-methodology/.git && \
  git -C ~/.local/share/ontology-methodology describe --tags

# b) repo.conf 登记有效?
grep -x "$HOME/.local/share/ontology-methodology" ~/.config/ontology-methodology/repo.conf

# c) venv 就绪?
test -x ~/.local/share/ontology-methodology/meta/scripts/.venv/bin/python && echo VENV-OK

# d) DSH profile 已装插件?(shell 通道访问 $DSH_HOME 会被拒绝,用 read 工具)
read ~/.dsh/profiles/<name>/package.json   # 查 dependencies 是否有 dsh-methodology-adapter
```

**判定表**（这是 SOP 的核心决策逻辑）：

| # | 本体已装 | repo.conf 有效 | profile 已装插件 | 动作 |
|---|---|---|---|---|
| 1 | 否 | — | — | 走 P2 + P3（全新机器） |
| 2 | 是 | 是 | 是 | **只走 P4**：确认 target 是否已建，未建则初始化 |
| 3 | 是 | 是 | 否 | P3 + P4 |
| 4 | 是 | 否(失效行) | — | 重跑 install.sh（幂等，自动重新登记）+ P4 |
| 5 | 开发 clone 会话 | — | — | 开发 clone 就是本体仓——直接跳到 P4，target 建在开发 clone 的 targets/ 下 |

**特殊场景**：当前会话的工作区就是开发 clone（或任何本体仓库）→ **完全不需要 install.sh**，target 建在当前仓库的 `targets/<project>/`。

## 3. P2 本体安装（幂等，重跑即升级）

```bash
curl -fsSL https://raw.githubusercontent.com/SachieWang/LiteODD/<tag>/install.sh | sh -s -- --repo https://github.com/SachieWang/LiteODD.git --version <tag>
# 私有仓库:手动 clone 后在仓库根执行 install.sh --dest <clone 路径>
```

install.sh 的内建保障（**你不需要额外做什么**）：
- `git pull --ff-only`：本地分叉时**失败退出而非 reset**，绝不静默覆盖用户的本地改动；
- clone/update → `uv sync` → gateway snapshot 冒烟校验 → repo.conf 登记（DEST 提至首行）；
- 版本可预期优先（--version 锁 tag）；**绝不触碰 targets/ 与 .agents/skills/（对象层与技能面完全不受安装影响）**。

**验证**：
```bash
cd ~/.local/share/ontology-methodology && \
  meta/scripts/.venv/bin/python meta/integrations/gateway.py snapshot
# 预期:合法 JSON 信封,root = 全局安装路径
```

## 4. P3 DSH 插件安装

**注意**：`dsh plugin` 是官方通道（自动审批认可），但修改 profile 属于影响 DSH 全局的操作——**执行前向用户确认 profile 名与 tag**。

LiteODD 仓库根没有 package.json，bundle 在子目录，git 通道必须用 pnpm 子目录语法：

```bash
dsh plugin --profile <name> add 'https://github.com/SachieWang/LiteODD.git#<tag>&path:/meta/integrations/dsh/bundle'
# & 必须加引号,否则被 bash 解释为后台符号!
```

- 通道选择：开发 link（`add ./meta/integrations/dsh/bundle`，仅限开发 clone 所在机器且用户明确要求）vs 分发 git tag（推荐，拷进 pnpm store 与源解耦）。
- 装入后 patchReload: live 热加载，**本会话工具表即出现 5 个 `methodology_*` 工具**。
- 升级 = `remove` + `add` 新 tag（同 spec 换 tag 号）。
- 兼容性：bundle 的 peer 声明（cordis/dsh-tools）不触发 DSH 的 `@deepseek-ai/dsh` 前缀强制检查；peer 警告是 web profile 全体插件的常态，可忽略。

**验证**：
```text
dsh --profile <name> --dump-config    # 出现 "# == dsh-methodology-adapter" 层
本会话工具表出现 methodology_status 等 5 工具 → 调 methodology_status(无参)
# 预期:返回契约快照,root = 解析到的本体仓库根
```

## 5. P4 为项目配置本体（target 初始化）

**这是"为项目配置"的唯一动作**——不是重装本体，不是重装插件，而是在本体仓库内创建该项目的对象层骨架。

### 5.1 target 落点决策

| 场景 | 落点 | 理由 |
|---|---|---|
| 全局安装服务多项目（默认） | `~/.local/share/ontology-methodology/targets/<project>/` | **公共工具体系仓形态**——全局安装就是那个共享仓，各项目 target 集中于此 |
| 项目仓库内自含 | `<项目仓库>/targets/<project>/` 且 repo.conf 登记该项目仓库 | **项目独享仓形态**——对象层随项目仓库走，可入项目 git |
| 开发 clone 会话 | 开发 clone 的 `targets/<project>/` | 开发者就是本体作者 |

> 风险提示：若把 target 建在全局安装，**升级/重装本体（install.sh git pull）不会丢 target**（install.sh 不触碰 targets/），但 `git checkout <tag>` 检出旧 tag 时**对象层与工具版本可能出现错位**——建议 tag 检出后验证 `methodology_status` 的 frame 版本与 target 三件套 `frame:` 字段一致。

### 5.2 初始化步骤（幂等，逐目录检查）

```text
1. 检查 targets/<project>/ 是否已存在 → 存在则跳过创建,报告"已配置"(
   避免覆盖;若三件套残缺,只补缺失文件,不覆盖已有内容)
2. mkdir -p targets/<project>/{ontology,artifacts/{requirements,adr,arch-reports,domain-models},evolution/retro}
3. 从 meta/templates/{instances,components,sources}.template.yaml 生成三件套,
   但【不要直接 cp】——模板里的占位条目(sp:<concept-slug> / <FrameType> 等)
   会被 check.py 判 fail。正确做法:保留头部注释(注释即填写指引)+ schemaVersion
   + frame 字段,把 instances:/components:/sources: 写成显式空列表 []。
   生成后必须跑 check 验证(见 P5)。
4. (可选)cp meta/evolution/retro/{accept,reject}-example.yaml → evolution/retro/(仅作示例,可留空)
5. 在 targets/<project>/ 放一份 README.md(仿 targets/dsh/README.md 的放置规则说明)
6. 业务内容(实例 id/组件/来源/artifact)由后续方法论技能(需求理解/领域建模/架构评估)填充,
   **本 SOP 不预填业务内容**
```

> 空骨架三件套的正确形态（已实测过 Layer 0）：
> ```yaml
> schemaVersion: 1.0
> frame: /meta/ontology/frame.yaml
> instances: []
> ```
> components.yaml / sources.yaml 同理（`components: []` / `sources: []`）。字段名与填写规则在模板头部注释里，骨架文件保留注释即保留了指引。

### 5.3 技能面配置（可选层）

| 场景 | 做法 |
|---|---|
| 全局通用 | 把方法论技能复制到 `~/.agents/skills/`（user-agents 根,全机所有项目可见——见 DSH skill-filesystem 的发现顺序） |
| 项目专属 | 复制到 `<项目仓库>/.agents/skills/`（project-agents 根） |

**注意**：技能的**源**各在其源目录（DSH 相关的两个在 `meta/integrations/dsh/skills/`，领域方法论技能在 meta 技能目录，以各自 SKILL.md 头部 metadata 注明），`.agents/skills/` 下的都是**消费副本**；改动只改源，副本随源同步（不搞双向同步）。

## 6. P5 验证与交付总结（必须全绿才交付）

| 验证项 | 命令/方法 | 预期 |
|---|---|---|
| 本体运行时 | `cd ~/.local/share/ontology-methodology && meta/scripts/.venv/bin/python meta/integrations/gateway.py snapshot` | 合法 JSON 信封 |
| 插件装载 | 本会话工具表出现 5 个 `methodology_*` 工具 | 工具表可见 |
| 工具实调 | `methodology_status`(无参) | 快照正常，root 命中预期仓库根 |
| target 就绪 | `methodology_check --target targets/<project>` | ok=true（**显式空列表**骨架实测通过；若误留模板占位条目会 fail——见 5.2） |
| 技能可见 | (若配置了)新会话的 available_skills 列表出现方法论技能 | 技能可用 |

## 7. 重复安装/重复配置的防护机制总表

**这套体系从设计上就是幂等与增量友好的**，重复走流程不会破坏已有安装，原因：

| # | 机制 | 位置 | 防护效果 |
|---|-----|---|---|
| 1 | install.sh 幂等（已存在→更新模式，ff-only 拒绝分叉绝不 reset） | install.sh | 重跑=升级，不覆盖本地分叉 |
| 2 | repo.conf 登记幂等（DEST 去重提首行） | install.sh | 多次登记不重复，最新优先 |
| 3 | resolveRoot 4 层解析（显式 repo → cwd/registry → repo.conf 兜底） | bundle/dynamic 两半 | 全局安装零参数可发现，无需每会话传 repo |
| 4 | target 初始化逐目录检查、只补缺不覆盖 | 本 SOP P4 | 二次配置不破坏已有对象层 |
| 5 | targets/ 与 .agents/skills/ 不入库（.gitignore），install.sh 不触碰 | .gitignore + install.sh | 重装/升级不影响项目对象层与技能面 |
| 6 | dsh plugin add 是幂等的 profile 依赖管理（remove + add 换 tag） | DSH 官方通道 | 升级插件不残留旧版本 |

**只有四个真正危险的操作**（SOP 里必须警示）：
1. `git checkout <旧tag>` 后在全局安装上跑新 frame 语义的 target —— **版本错位**（见 5.1 风险提示）；
2. 手动编辑 repo.conf 不验证（失效行静默跳过是安全设计，但把路径写错会导致工具退化为要求显式 repo 参数——不会损坏，只是体验降级）；
3. **删除/移动全局安装目录**而不清理 repo.conf ——失效行会被静默跳过，工具退化为要求显式 repo（安全）；**删除整个 repo.conf 则丢失兜底**；
4. 在全局安装的 git 仓库里对 targets/ 或其他未跟踪文件做 git clean/checkout 强制操作——对象层是未跟踪的本机数据，git 强制操作可能清除它们（install.sh 自身不会，但 agent 代跑 git 命令时可能）。

**会话级的注意事项**：
- 开发 clone 会话中，R1 语义保证工具优先命中开发 clone（cwd 候选优先于 repo.conf）——**这是设计行为不是 bug**：你正在改 master，工具跑的就是你改的代码；只有探测全 miss 才落到全局安装。
- palantir 等无关项目会话中，前 2 层 miss，repo.conf 兝底命中全局安装——零参数可用。
- 开发 clone 的 targets/ 被 .gitignore，**全局安装的 targets/ 同样不入 git**（install.sh gitignore 相同）——多项目对象层集中在全局安装目录下，**既不进 LiteODD 库也不进项目库**，是纯本机数据；如需入项目库，用 5.1 的"项目独享仓"形态。

## 8. 升级与卸载

**升级本体**：重跑 install.sh --version <新tag>（幂等）。升级不会动 targets/ 与技能面。
**升级插件**：`dsh plugin --profile <name> remove dsh-methodology-adapter && dsh plugin --profile <name> add '...#<新tag>&path:...'`。若当前会话正是开发 clone 会话，重装后 R1 兜底仍优先命中开发 clone——行为正确。
**卸载**：`dsh plugin --profile <name> remove dsh-methodology-adapter`；本体卸载 = `rm -rf ~/.local/share/ontology-methodology`（需用户确认）+ 从 repo.conf 删除对应行（或重跑 install.sh 到别处自动重排）。

## 9. Agent 执行清单（一句话展开为五阶段）

用户说「安装 LiteODD 并为 X 项目配置本体」时，按序执行：

```text
P1 预检(只读) → 判定表定路径
P2 本体安装(如需) → install.sh 幂等安装/升级
P3 插件安装(如需) → dsh plugin add(确认 profile/tag 后)
P4 target 初始化 → 三件套模板 + artifacts 四目录 + evolution(增量、不覆盖)
P5 验证 → status 实调 + check 空骨架 + 技能可见性 → 交付总结
```

**红线**（任何情况下不得违反）：
1. **绝不覆盖 targets/<project>/ 已有内容**——只补缺，不改写；
2. **绝不用 rm -rf 清理全局安装/全局技能目录**（自动审批会对这类命令出现锁定类拒绝；确需卸载请用户人工执行）；
3. **绝不在未确认 profile 名与 tag 前执行 dsh plugin add/remove**；
4. **绝不 git reset/force 处理**——install.sh ff-only 失败时报告用户人工决策；
5. **绝不把业务内容预填进 target 骨架**——那是方法论技能的职责；**也绝不直接 cp 模板文件当骨架**——占位条目会让 check fail，骨架必须是显式空列表；
6. 升级 bundle 时若无法确定当前 tag，先 `read ~/.dsh/profiles/<profile>/package.json` 的 dependencies 查当前 spec。
