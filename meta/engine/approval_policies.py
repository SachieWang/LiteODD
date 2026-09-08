# =============================================================================
# 方法论 Layer 2 —— 审批策略提供者 (approval-policy provider)
# -----------------------------------------------------------------------------
# 审批 ≠ 闸门:闸门是确定性机器裁决;审批是"放行策略"。提供者返回三态
#   approve / reject / hold,引擎只按三态执行,不写死规则。
# 默认提供者 = human(人环暂停)。将来可加 policy(阈值自动)作为新增注册项,
# 由 add-only 保证:提高自动化率 = 加提供者,不改 human 默认、不改三态语义。
# =============================================================================
from __future__ import annotations

# 单向注册表:provider-id -> fn(context) -> "approve" | "reject" | "hold"
PROVIDERS: dict[str, object] = {}


def register(provider_id: str):
    def deco(fn):
        PROVIDERS[provider_id] = fn
        return fn
    return deco


def decide(provider_id: str, context: dict):
    fn = PROVIDERS.get(provider_id) or PROVIDERS["human"]
    return fn(context)


@register("human")
def _human(context: dict):
    """默认:人环暂停。返回 hold(等显式人工确认);引擎在 assume-approval 下视为 approve。"""
    return "hold"


@register("policy")
def _policy(context: dict):
    """加性示例(非默认):阈值自动审批。approve/reject 由阈值规则计算。"""
    threshold = context.get("policyThreshold", 0)
    pass_rate = context.get("passRate", 1.0)
    return "approve" if pass_rate >= threshold else "hold"


DEFAULT_PROVIDER = "human"
