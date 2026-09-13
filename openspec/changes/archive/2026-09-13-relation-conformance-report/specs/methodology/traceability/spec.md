## ADDED Requirements

### Requirement: Relation-type conformance metric
The traceability tool's report SHALL state, per target, how many frame-declared relation types are actually used by domain models, which relation types are used but not declared in the frame (naming the artifacts that use them), and which declared types are used by no artifact. This metric SHALL be reported and SHALL NOT gate the pipeline.

#### Scenario: Undeclared relation type is surfaced without failing
- **WHEN** a domain model uses a relationship `type` that the frame does not declare
- **THEN** the report names that type together with the artifacts using it, and the command still exits `0`

#### Scenario: Declared-but-unused types are surfaced
- **WHEN** a relation type declared in the frame appears in no artifact
- **THEN** the report lists it as declared-but-unused, without failing

#### Scenario: Hard verification is unaffected
- **WHEN** the same target is checked by the hard link-integrity verification
- **THEN** its pass/fail outcome depends only on link integrity, never on relation-type conformance
