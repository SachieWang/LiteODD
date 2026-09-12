## 1. 反馈捕获

- [x] 1.1 Create `/meta/evolution/retro.md` as the feedback-capture template stating signal, evidence (e.g. Layer 2 audit reference), and an allowed absorption target among frame type/relation, metaschema field, skill step/heuristic, gate rule, or method anti-pattern; verify it exists with all five targets and the mandatory fields.
- [x] 1.2 Create an example candidate under `/meta/evolution/retro/` (accept-case) and one (reject-case) each recording signal/evidence/target/version/add-only compatibility; verify both YAML files parse and record the required fields.

## 2. 收敛裁判

- [x] 2.1 Create `/meta/evolution/judge.py` as the deterministic convergence judge: accepts a candidate and verifies three conditions (1 recorded as a versioned methodology change, 2 bench passes, 3 add-only compatible); returns accept with reasons or reject/defer with the failing criterion; verify it runs on an accept-case (exit 0) and a reject-case (exit 1, naming the failing criterion).
- [x] 2.2 Verify the judge does NOT absorb anything itself (it only gates a candidate; absorption is a separate methodology change), and verify the code never calls the LLM to decide absorption.

## 3. 基准回归

- [x] 3.1 Create `/meta/evolution/bench.py` that re-runs the Layer 2 engine (`engine.py --assume-approval`) and the compliance checker (`check.py`) over the seed set `targets/dsh`, returning 0 only when both pass; verify it exits 0 on the current seed set.
- [x] 3.2 Verify a bench failure would block absorption by making the judge consult the bench result as one of its three conditions; verify the wiring exists in judge.py.

## 4. meta-only / 版本化 / add-only 纪律文档

- [x] 4.1 Create `/meta/evolution/README.md` documenting the convergence policy (judge three conditions, bench regression on seed, meta-only absorption, versioned trail, add-only compatibility) and the absorption=methodology-change rule; verify it exists with that content.

## 5. 验证

- [x] 5.1 Run `bench.py` on `targets/dsh` and verify it passes (exit 0). Run `judge.py` on the accept-case (exit 0) and reject-case (exit 1 with failing criterion) and verify both outcomes.
- [x] 5.2 Run the Layer 0 checker (`uv run --project meta/scripts python meta/scripts/check.py targets/dsh`) after this change and verify it still passes (6 artifacts, 0 failures, 13 instances resolve).

## 6. 整体校验与归档

- [x] 6.1 Validate the change with `openspec validate <change>`; verify it is valid. After sync, validate main specs with `openspec validate --specs`; verify all methodology specs validate.
