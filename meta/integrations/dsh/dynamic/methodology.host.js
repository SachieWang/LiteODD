// =============================================================================
// DSH 适配壳 —— Cordis 动态插件 **Host 半**(code.host)
// -----------------------------------------------------------------------------
// 定位:这是"集成适配层"里唯一 DSH 专有的部分。它不复制任何裁决语义,只把
// meta/integrations/gateway.py 暴露成 DSH 的 **动态模型工具**(调用面)+ 一个
// 给浏览器半用的 host RPC(感知面)。
//
// 三段式分工(与设计讨论的"三平面"一致):
//   提议(LLM/skill)  →  裁决(本文件的工具 → gateway.py → core 脚本)  →  版本化(OpenSpec change)
//   本文件只负责中间那段"触发 + 搬运 + 结构化回传";吸收不在壳里。
//
// 运行环境约束(DSH dynamic package sandbox,见 cordis-plugin-development skill):
//   - 这是 **函数体**,不是模块:没有 import / require / TS / JSX。
//   - 可用全局只有:ctx / harness / console / btoa / atob / TextEncoder / TextDecoder
//     (以及标准内置对象)。没有 process / Buffer / fetch / setTimeout。
//   - 一切文件与进程工作走 Cordis service:本文件用 ctx.shell(ShellExecutor)。
//   - 每个贡献都绑 fiber:harness.registerTool / harness.handle 的返回值即 disposer,
//     停用或更新插件时自动撤销。
//
// 装载方式(二选一):
//   A. 动态零安装:用 cordis_define 传本文件为 code.host、
//      methodology.client.js 为 code.client,再 cordis_run(步骤见本目录 README)。
//   B. 常驻 bundle:见 ../bundle/(dsh.bundle 静态行,进程启动即装载,无需每次 define)。
//
// 本文件只依赖 gateway.py 的 JSON 信封契约(meta/integrations/schemas/verdict.schema.json)。
//
// --- 仓库根解析(实测教训,勿回退) ------------------------------------------
// 旧版让 shell 自己决定工作目录,只在"环境恰好是仓库根"时成立。实测在 DSH 里
// 不成立:动态包的 shell.run 若不显式给 workdir,拿到的是 shell 实现的**默认工作
// 目录**,它不保证等于会话工作区;于是 `uv` 报
//   error: Project directory `meta/scripts` does not exist
// 而 gateway 根本没跑起来。现在改为**显式解析仓库根**,不再依赖环境:
//   1. 工具参数 repo(显式指定,优先级最高);
//   2. shell.resolve() 暴露的默认 workdir;
//   3. workspaceRegistry 里已注册的工作区路径。
// 候选逐个用一次 shell 往返做 `[ -f <cand>/meta/integrations/gateway.py ]` 判定,
// 命中者即仓库根;每次执行都把 workdir 与 `cd` 一起钉死在该根上。
// =============================================================================
const GATEWAY_REL = 'meta/integrations/gateway.py'
// POSIX 优先直接调 uv 建好的 venv(快、免 uv 启动与缓存);缺失时回落到 uv run。
// uv 回落到同样需要可写缓存(沙箱内 ~/.cache/uv 往往只读),所以两条路都先把
// UV_* 指到工作目录内 —— 工作目录此时已被 resolveRoot 钉死在仓库根。
const RUNNER = 'export UV_CACHE_DIR="$PWD/.uv-cache" UV_PYTHON_INSTALL_DIR="$PWD/.uv-python"; '
  + 'if [ -x meta/scripts/.venv/bin/python ]; then PY=meta/scripts/.venv/bin/python; '
  + 'else PY="uv run --project meta/scripts python"; fi; exec $PY ' + GATEWAY_REL

// --- 小工具:shell 单引号转义(只用标准字符串 API,沙箱内可用) -----------------
function q(value) {
  return "'" + String(value).split("'").join("'\\''") + "'"
}

// --- 统一输出形状(与 toGateValue 的返回键严格对应) --------------------------
// output.schema 用的是 **ValueSchemaSpec**:object 节点必须显式写
// additionalProperties,且必填只能写成**属性级** `required: true`(对象节点上的
// `required: [...]` 会被 DSL 拒绝)。这与 parameters 的 raw object 根写法不同,
// tests/verify-adapter.mjs 用 DSH 自带 valueSchemaSpecToJsonSchema 钉住该契约。
const STEP_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string', required: true },
    ok: { type: 'boolean', required: true },
    exitCode: { type: 'integer', required: true },
    summary: { type: 'string', required: true },
  },
}
const GATE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean', required: true, description: '整体判决:所有 core 步骤 exit 0 才 true(权威来源是 core 脚本 exit code)。' },
    verdict: { type: 'string', required: true, enum: ['pass', 'fail'] },
    exitCode: { type: 'integer', required: true },
    command: { type: 'string', required: true },
    target: { type: 'string', required: true, description: '目标项目目录(相对仓库根);未提供为空串。' },
    candidate: { type: 'string', required: true, description: '候选 YAML 路径(相对仓库根);未提供为空串。' },
    steps: { type: 'array', required: true, items: STEP_SCHEMA },
    judgeVerdict: { type: 'string', required: true, description: 'ACCEPT / REJECT/DEFER;未跑 judge 为空串。' },
    judgeRecord: { type: 'string', required: true, enum: ['pass', 'fail', 'unknown'] },
    judgeBench: { type: 'string', required: true, enum: ['pass', 'fail', 'unknown'] },
    judgeAddOnly: { type: 'string', required: true, enum: ['pass', 'fail', 'unknown'] },
    notes: { type: 'array', required: true, items: { type: 'string' } },
    summary: { type: 'string', required: true, description: '人读摘要(模型可见内容)。' },
  },
}
const STATUS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean', required: true },
    root: { type: 'string', required: true, description: '本次实际使用的仓库根(解析结果);用于确认适配壳没有跑错目录。' },
    frameSchemaVersion: { type: 'string', required: true },
    conceptTypes: { type: 'array', required: true, items: { type: 'string' } },
    relationTypes: { type: 'array', required: true, items: { type: 'string' } },
    metaschemas: { type: 'array', required: true, items: { type: 'string' } },
    stages: { type: 'array', required: true, items: { type: 'string' } },
    absorptionTargets: { type: 'array', required: true, items: { type: 'string' } },
    candidates: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string', required: true },
          path: { type: 'string', required: true },
          target: { type: 'string', required: true },
          benchStatus: { type: 'string', required: true },
          addOnly: { type: 'string', required: true },
          changeRecordExists: { type: 'boolean', required: true },
        },
      },
    },
    targets: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          path: { type: 'string', required: true },
          artifacts: { type: 'integer', required: true },
          hasObjectRealm: { type: 'boolean', required: true },
        },
      },
    },
    gateCommands: { type: 'array', required: true, items: { type: 'string' } },
    summary: { type: 'string', required: true },
  },
}

// --- 参数 schema(DSH 统一 DSL) --------------------------------------------
// 注意:这里用 object 根(raw 模式),必填**只能**由根的 required 数组声明;
// 在 raw 模式给单个属性写 `required: true` 会被 Guard 直接拒绝
// ("required belongs to the containing raw object schema")。
const P_REPO = { type: 'string', description: '方法论仓库根目录(绝对路径)。省略则由适配壳自动解析(默认工作目录 + 已注册工作区)。' }
const P_TARGET = { type: 'string', description: '目标项目目录,相对仓库根,例如 targets/dsh。' }
const P_CANDIDATE = { type: 'string', description: '复盘候选 YAML 路径,相对仓库根,例如 meta/evolution/retro/accept-example.yaml。' }

function textBlock(text) {
  return [{ type: 'text', text: text }]
}

// --- 从 gateway 信封提炼模型可用的扁平结果 -----------------------------------
function toGateValue(env) {
  const g = env.gateway || {}
  const j = env.judge || null
  const c = (j && j.conditions) || {}
  const steps = (env.steps || []).map(function (s) {
    return { name: String(s.name), ok: !!s.ok, exitCode: Number(s.exitCode), summary: String(s.summary || '') }
  })
  const notes = j && j.notes ? j.notes.map(function (n) { return String(n) }) : []
  const verdict = String(g.verdict || 'fail')
  const lines = ['[methodology] ' + String(g.command || '?') + ' -> ' + verdict
    + ' (exit ' + Number(g.exitCode === undefined ? 2 : g.exitCode) + ')']
  if (env.target) lines.push('target: ' + env.target)
  if (env.candidate) lines.push('candidate: ' + env.candidate)
  for (let i = 0; i < steps.length; i++) {
    lines.push((steps[i].ok ? '  ok  ' : '  FAIL ') + steps[i].name + ': ' + steps[i].summary)
  }
  if (j) {
    lines.push('judge: ' + String(j.verdict)
      + ' | record=' + String(c.record || 'unknown')
      + ' bench=' + String(c.bench || 'unknown')
      + ' addonly=' + String(c.addonly || 'unknown'))
  }
  for (let i = 0; i < notes.length; i++) lines.push('  ' + notes[i])
  return {
    ok: verdict === 'pass',
    verdict: verdict,
    exitCode: Number(g.exitCode === undefined ? 2 : g.exitCode),
    command: String(g.command || 'unknown'),
    target: env.target ? String(env.target) : '',
    candidate: env.candidate ? String(env.candidate) : '',
    steps: steps,
    judgeVerdict: j ? String(j.verdict) : '',
    judgeRecord: String(c.record || 'unknown'),
    judgeBench: String(c.bench || 'unknown'),
    judgeAddOnly: String(c.addonly || 'unknown'),
    notes: notes,
    summary: lines.join('\n'),
  }
}

function toStatusValue(env) {
  const s = env.snapshot || {}
  const f = s.frame || {}
  const candidates = (s.candidates || []).map(function (c) {
    return {
      id: String(c.id || ''),
      path: String(c.path || ''),
      target: String(c.target || ''),
      benchStatus: String(c.benchStatus || ''),
      addOnly: c.addOnly === true ? 'true' : (c.addOnly === false ? 'false' : ''),
      changeRecordExists: !!c.changeRecordExists,
    }
  })
  const targets = (s.targets || []).map(function (t) {
    return { path: String(t.path || ''), artifacts: Number(t.artifacts || 0), hasObjectRealm: !!t.hasObjectRealm }
  })
  const gates = s.gates || {}
  const gateCommands = ['check', 'bench', 'judge', 'engine', 'gateway'].map(function (k) {
    return k + ': ' + String(gates[k] || '')
  })
  const conceptTypes = (f.conceptTypes || []).map(String)
  const lines = ['[methodology] 契约快照 @ ' + String(s.root || '?')]
  lines.push('  frame v' + String(f.schemaVersion) + ' | 概念类型 ' + conceptTypes.length + ' | 关系类型 ' + (f.relationTypes || []).length)
  lines.push('  阶段: ' + (s.orchestratorStages || []).join(' -> '))
  lines.push('  候选 ' + candidates.length + ' 条;目标 ' + targets.length + ' 个')
  for (let i = 0; i < candidates.length; i++) {
    lines.push('   - ' + candidates[i].id + ' [' + candidates[i].target + '] bench=' + candidates[i].benchStatus
      + ' addonly=' + candidates[i].addOnly + ' changeRecord=' + (candidates[i].changeRecordExists ? '存在' : '缺失'))
  }
  return {
    ok: true,
    root: String(s.root || ''),
    frameSchemaVersion: String(f.schemaVersion === undefined ? '' : f.schemaVersion),
    conceptTypes: conceptTypes,
    relationTypes: (f.relationTypes || []).map(String),
    metaschemas: (s.metaschemas || []).map(String),
    stages: (s.orchestratorStages || []).map(String),
    absorptionTargets: (s.absorptionTargets || []).map(String),
    candidates: candidates,
    targets: targets,
    gateCommands: gateCommands,
    summary: lines.join('\n'),
  }
}

return {
  name: 'methodology-adapter',
  // shell 是硬依赖:没有它整条适配链无法工作。声明后 Cordis 会在其缺席时挂起本包,
  // 而不是让 apply 半途静默失效。
  inject: ['shell'],
  apply(ctx) {
    const shell = ctx.get('shell')
    if (shell === undefined) return

    // ---- 仓库根解析(见文件头"实测教训") -----------------------------------
    // 候选来源只读标量:probe.workdir 与 workspace.path。workspaceRegistry 是可选
    // 依赖,缺席时静默跳过;绝不把 live 的 workspace 实体留给后续使用。
    function candidateRoots() {
      const out = []
      const push = function (value) {
        if (typeof value !== 'string' || value.length === 0) return
        if (out.indexOf(value) === -1) out.push(value)
      }
      try {
        const probe = shell.resolve({ command: 'true' })
        if (probe && typeof probe.workdir === 'string') push(probe.workdir)
      } catch (error) { /* 探测失败不致命:继续用工作区候选 */ }
      const registry = ctx.get('workspaceRegistry')
      if (registry !== undefined) {
        try {
          const workspaces = registry.list()
          for (let i = 0; i < workspaces.length; i++) {
            push(workspaces[i] ? workspaces[i].path : '')
          }
        } catch (error) { /* 注册表不可用则忽略 */ }
      }
      return out
    }

    // 一次 shell 往返问完所有候选:命中即回 REPO_INDEX=<n>。避免"每个候选一次往返"。
    async function resolveRoot(args, exec) {
      const explicit = args && typeof args.repo === 'string' ? args.repo : ''
      if (explicit.length > 0) return explicit
      const roots = candidateRoots()
      if (roots.length === 0) {
        throw new Error('methodology adapter 无法解析仓库根:未提供 repo,也没有可探测的候选目录。请显式传 repo(方法论仓库根的绝对路径)。')
      }
      const quoted = []
      for (let i = 0; i < roots.length; i++) quoted.push(q(roots[i]))
      const script = 'i=0; for d in ' + quoted.join(' ') + '; do '
        + 'if [ -f "$d/' + GATEWAY_REL + '" ]; then echo "REPO_INDEX=$i"; exit 0; fi; '
        + 'i=$((i+1)); done; echo REPO_NONE; exit 3'
      const request = { command: script, timeoutMs: 30000 }
      if (exec && exec.signal) request.signal = exec.signal
      const result = await shell.run(shell.resolve(request))
      const stdout = result.stdout && result.stdout.text ? result.stdout.text : ''
      const matched = stdout.match(/REPO_INDEX=(\d+)/)
      if (matched) {
        const hit = roots[Number(matched[1])]
        if (typeof hit === 'string') return hit
      }
      throw new Error('methodology adapter 未能在候选目录中找到 ' + GATEWAY_REL + ';候选: '
        + roots.join(' , ') + '。请用 repo 参数显式指定方法论仓库根。')
    }

    // 同一次调用内的 shell 往返:解析仓库根 → 构造命令 → resolve 补默认值 → run。
    // 只把 workdir 写进 request(不 resolve 之后再改 spec):resolved spec 由实现
    // 拥有,不保证可变,靠 request 交给实现才是契约内的做法。
    async function runGateway(subArgs, args, exec) {
      const root = await resolveRoot(args, exec)
      const command = 'cd ' + q(root) + ' && ' + RUNNER + ' ' + subArgs.join(' ')
      const request = { command: command, workdir: root, timeoutMs: 600000, stdoutMaxBytes: 4194304 }
      if (exec && exec.signal) request.signal = exec.signal
      const result = await shell.run(shell.resolve(request))
      const stdout = result.stdout && result.stdout.text ? result.stdout.text : ''
      const stderr = result.stderr && result.stderr.text ? result.stderr.text : ''
      let env = null
      try {
        env = JSON.parse(stdout)
      } catch (error) {
        throw new Error('methodology gateway 输出不是 JSON(exit ' + String(result.exitCode) + ')。'
          + '仓库根解析为 ' + root + '(候选: ' + candidateRoots().join(' , ') + ')。'
          + '请确认该目录下存在 ' + GATEWAY_REL + ',或用 repo 参数显式指定。'
          + ' stdout 尾部: ' + stdout.slice(-400) + ' | stderr 尾部: ' + stderr.slice(-400))
      }
      // exitCode 2 = 网关自身的基础设施/用法错误 → 这是真的工具失败,抛出去。
      if (env.gateway && Number(env.gateway.exitCode) === 2) {
        throw new Error('methodology gateway 用法/基础设施错误: ' + String(env.error || '(无说明)'))
      }
      return env
    }

    // ---- 调用面:把一个 core 步骤包成模型工具 -------------------------------
    function register(name, description, parameters, run) {
      const tool = harness.defineTool({
        name: name,
        description: description,
        parameters: parameters,
        output: {
          schema: GATE_SCHEMA,
          render: function (toolArgs, value) { return textBlock(value.summary) },
        },
        execute: run,
      })
      harness.registerTool(ctx, tool)
    }

    const COMMON = '本工具是集成适配壳,只触发 meta/integrations/gateway.py 并搬运结果;'
      + '吸收是否合规的裁决仍只由 core 的 judge.py/bench.py 定义,壳不复制、不改写。'

    register('methodology_bench',
      COMMON + ' 跑 Layer 3 基准回归:check.py(Layer 0 合规)+ engine.py(Layer 2 确定性闸门)。全部通过才 ok=true。',
      { type: 'object', properties: { target: P_TARGET, repo: P_REPO }, required: ['target'] },
      async function (args, exec) {
        return toGateValue(await runGateway(['bench', '--target', q(args.target)], args, exec))
      })

    register('methodology_check',
      COMMON + ' 只跑 Layer 0 单一合规校验 check.py(三段不变量 + conceptRef 解析),不做回归。',
      { type: 'object', properties: { target: P_TARGET, repo: P_REPO }, required: ['target'] },
      async function (args, exec) {
        return toGateValue(await runGateway(['check', '--target', q(args.target)], args, exec))
      })

    register('methodology_judge',
      COMMON + ' 对一条复盘候选跑 Layer 3 收敛裁判 judge.py:结构化返回三条条件'
      + '(record/bench/addonly)与 ACCEPT / REJECT、DEFER。judge 判定 ACCEPT 只表示"准入门通过",'
      + '真正吸收仍需发起一条版本化的方法论 change。',
      {
        type: 'object',
        properties: {
          candidate: P_CANDIDATE,
          target: { type: 'string', description: 'bench_status=auto 时必需;judge 用它实跑基准回归。' },
          repo: P_REPO,
        },
        required: ['candidate'],
      },
      async function (args, exec) {
        const sub = ['judge', '--candidate', q(args.candidate)]
        if (args.target) sub.push('--target', q(args.target))
        return toGateValue(await runGateway(sub, args, exec))
      })

    register('methodology_gate',
      COMMON + ' 单一网关:一次调用跑完 bench(Layer 3 回归)并在给出候选时续跑 judge。'
      + '这是替代"人手动连敲三条命令"的入口。',
      {
        type: 'object',
        properties: { target: P_TARGET, candidate: { type: 'string', description: '可选;给出则续跑 judge。' }, repo: P_REPO },
        required: ['target'],
      },
      async function (args, exec) {
        const sub = ['gate', '--target', q(args.target)]
        if (args.candidate) sub.push('--candidate', q(args.candidate))
        return toGateValue(await runGateway(sub, args, exec))
      })

    // status 的输出形状与 gate 不同,单独注册。
    const statusTool = harness.defineTool({
      name: 'methodology_status',
      description: '读取方法论契约的只读快照(感知面):frame 版本与概念/关系类型、元模型清单、'
        + '编排阶段、五类吸收目标、当前复盘候选及其自述字段、目标项目清单、以及唯一权威闸门命令。'
        + '写候选或判断"下一步该跑什么"之前先看它,免去每轮手动翻 retro.md / frame.yaml。',
      parameters: { type: 'object', properties: { repo: P_REPO }, required: [] },
      output: {
        schema: STATUS_SCHEMA,
        render: function (toolArgs, value) { return textBlock(value.summary) },
      },
      execute: async function (args, exec) {
        return toStatusValue(await runGateway(['snapshot'], args, exec))
      },
    })
    harness.registerTool(ctx, statusTool)

    // ---- 感知面 / 交互面:给浏览器半的包内私有 RPC(Client → Host) -----------
    // 返回原始信封(HTML/JS 侧自行取字段);host.call 只走无损 JSON。
    harness.handle('snapshot', async function (args) {
      const a = args && typeof args === 'object' ? args : {}
      return await runGateway(['snapshot'], a, null)
    })
    harness.handle('gate', async function (args) {
      const a = args && typeof args === 'object' ? args : {}
      if (typeof a.target !== 'string' || a.target.length === 0) {
        throw new Error('host.call("gate") 需要 { target: string, candidate?: string }')
      }
      const sub = ['gate', '--target', q(a.target)]
      if (typeof a.candidate === 'string' && a.candidate.length > 0) sub.push('--candidate', q(a.candidate))
      return await runGateway(sub, a, null)
    })
    harness.handle('judge', async function (args) {
      const a = args && typeof args === 'object' ? args : {}
      if (typeof a.candidate !== 'string' || a.candidate.length === 0) {
        throw new Error('host.call("judge") 需要 { candidate: string, target?: string }')
      }
      const sub = ['judge', '--candidate', q(a.candidate)]
      if (typeof a.target === 'string' && a.target.length > 0) sub.push('--target', q(a.target))
      return await runGateway(sub, a, null)
    })

    console.log('methodology adapter host half active: 5 tools + snapshot/judge/gate RPC')
  },
}
