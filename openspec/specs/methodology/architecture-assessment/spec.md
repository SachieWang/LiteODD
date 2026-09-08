# architecture-assessment Specification

## Purpose

Defines the architecture analysis/assessment/improvement skill contract: how a requirement set plus existing architecture maps to an assessed architecture report and decision records (ADRs) that reference the ontology spine.

## Requirements

### Requirement: Skill has a fixed five-part contract
The architecture-assessment skill SHALL declare and expose a trigger condition, an input schema, an ordered step list, an output schema, and a quality gate, so any agent invoking it follows the same contract.

#### Scenario: Contract present when loaded
- **WHEN** an agent loads this skill
- **THEN** it finds explicit sections for trigger, input schema, steps, output schema, and quality gate

### Requirement: Ontology-anchored assessment target
The skill SHALL assess existing architecture against the project's component index and ontology instances, so every assessed element maps to a resolvable instance.

#### Scenario: Assessed element resolves to instance
- **WHEN** the skill assesses a component or seam (e.g. deepseek-harness capability-seam)
- **THEN** the produced report carries a `targetRef` to a resolvable project instance

### Requirement: Quality-attribute mapping and views
The skill SHALL map requirements to quality attributes, and produce module and runtime views grounded in the project's component index, before gap analysis.

#### Scenario: Views and quality attributes present
- **WHEN** the skill produces an architecture report
- **THEN** the report includes quality attributes and module/runtime views

### Requirement: Gap analysis and evolution recommendations
The skill SHALL identify gaps between current architecture and the requirement set, and produce evolution recommendations.

#### Scenario: Gaps and recommendations recorded
- **WHEN** the skill completes an assessment
- **THEN** the report lists gaps and recommendations

### Requirement: Decisions recorded as ADRs
Architectural decisions made during assessment SHALL be recorded as ADRs conforming to `adr.schema.json`, carrying resolvable `conceptRef` and a decision chain (`status`, `supersedes`).

#### Scenario: ADR decision chain
- **WHEN** the skill records a decision
- **THEN** the ADR has a valid status, resolvable conceptRef, and a supersedes chain

### Requirement: Quality gate = compliance plus resolution
The skill's quality gate SHALL run the meta-layer compliance checker over the report and ADRs, and require all `conceptRef`/`targetRef` values to resolve within the project instance file.

#### Scenario: Gate blocks unresolved references
- **WHEN** a produced report or ADR fails compliance or has an unresolvable `targetRef`/`conceptRef`
- **THEN** the skill reports it as failing the quality gate rather than releasing it
