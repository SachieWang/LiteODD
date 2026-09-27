// =============================================================================
// 方法论适配壳 —— 共享工具核心 (bundle/静态 与 dynamic/动态 的单一事实源)
// -----------------------------------------------------------------------------
// 本文件是纯 ESM 模块,无 import 依赖;内容与 dynamic/methodology.host.js 的
// 对应段落**逐段一致**(由 tests/verify-adapter.mjs 的等价断言强制)。
// 动态半因沙箱限制不能用 import,保持函数体内联;静态 bundle 从这里 import。
// 两边的差异只允许是"包裹方式",不允许是逻辑。
// =============================================================================

// --- 网关路径与 runner(与动态半 RUNNER 常量一致) --------------------------
export const GATEWAY_REL = 'meta/integrations/gateway.py'
export const RUNNER = 'export UV_CACHE_DIR="$PWD/.uv-cache" UV_PYTHON_INSTALL_DIR="$PWD/.uv-python"; '
  + 'if [ -x meta/scripts/.venv/bin/python ]; then PY=meta/scripts/.venv/bin/python; '
  + 'else PY="uv run --project meta/scripts python"; fi; exec $PY ' + GATEWAY_REL

// --- shell 单引号转义 -------------------------------------------------------
export function q(value) {
  return "'" + String(value).split("'").join("'\\''") + "'"
}

// --- 输出 schema(ValueSchemaSpec;属性级 required,object 显式 additionalProperties)
export const STEP_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string', required: true },
    ok: { type: 'boolean', required: true },
    exitCode: { type: 'integer', required: true },
    summary: { type: 'string', required: true },
  },
}
export const GATE_SCHEMA = {
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
export const STATUS_SCHEMA = {
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

// --- 参数 schema(DSH 统一 DSL;raw object 根,必填只由根 required 数组声明)---
export const P_REPO = { type: 'string', description: '方法论仓库根目录(绝对路径)。省略则由适配壳自动解析(默认工作目录 + 已注册工作区)。' }
export const P_TARGET = { type: 'string', description: '目标项目目录,相对仓库根,例如 targets/dsh。' }
export const P_CANDIDATE = { type: 'string', description: '复盘候选 YAML 路径,相对仓库根,例如 meta/evolution/retro/accept-example.yaml。' }

export function textBlock(text) {
  return [{ type: 'text', text: text }]
}

// --- 信封 → 模型可用扁平结果 -------------------------------------------------
export function toGateValue(env) {
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

export function toStatusValue(env) {
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
