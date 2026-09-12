# requirement-understanding Specification

## Purpose

Defines the requirements-understanding skill contract: how raw requirements or interview/vision input is converted into a structured, ontology-aligned, verifiable requirement set that conforms to the meta-layer requirement schema.

## Requirements

### Requirement: Skill has a fixed five-part contract
The requirements-understanding skill SHALL declare and expose a trigger condition, an input schema, an ordered step list, an output schema, and a quality gate, so any agent invoking it follows the same contract.

#### Scenario: Contract present when loaded
- **WHEN** an agent loads this skill
- **THEN** it finds explicit sections for trigger, input schema, steps, output schema, and quality gate

### Requirement: Ontology-first term alignment
The skill SHALL first consult the meta ontology frame and the target project's instance file, mapping terms in the raw requirement to resolvable instance `conceptRef`s before producing any requirement item.

#### Scenario: Terms aligned before output
- **WHEN** the skill processes a raw requirement containing a domain term (e.g. `capability-seam` in deepseek-harness)
- **THEN** the term is mapped to a `conceptRef` resolvable against the project instance file, and the produced item carries it

### Requirement: Structured, verifiable requirement items
The skill SHALL decompose the raw input into requirement items, each carrying an id, a single concern, a source (provenance), at least one resolvable `conceptRef`, and verifiable acceptance criteria, conforming to `requirement.schema.json`.

#### Scenario: Decomposition with source and acceptance
- **WHEN** the skill produces a requirement item from a meeting record or document
- **THEN** the item has a `source`, a `conceptRef`, and non-empty acceptance criteria, and conforms to the requirement meta-schema

### Requirement: Uncertainty flagged explicitly
The skill SHALL mark uncertain or ambiguous input (missing scope, unresolved terms, contradictory statements) as flagged uncertainty rather than silently guessing.

#### Scenario: Ambiguity surfaced
- **WHEN** the input has an unresolvable or contradictory statement
- **THEN** the skill records it as a flagged uncertainty instead of inventing a requirement

### Requirement: Quality gate = compliance plus resolution
The skill's quality gate SHALL run the meta-layer compliance checker over the produced requirement items and require that all `conceptRef` entries resolve within the project instance file.

#### Scenario: Gate blocks unresolved items
- **WHEN** a produced requirement item fails the compliance checker or has an unresolvable `conceptRef`
- **THEN** the skill reports the item as failing the quality gate rather than releasing it

### Requirement: Source is a resolvable reference
The requirements-understanding skill SHALL emit each requirement's `source` as a resolvable reference — either `file:<repo-relative path>` (which must exist) or a source id registered in the target project's `ontology/sources.yaml` — and SHALL NOT emit free-text source labels, so provenance can be machine-verified.

#### Scenario: Emits a resolvable source
- **WHEN** the skill produces a requirement item from a document or a conversation
- **THEN** its `source` is a `file:` path that exists or a registered source id

#### Scenario: Free-text source is refused
- **WHEN** the only available provenance is an unrecorded label
- **THEN** the skill registers a described source entry (or cites an existing file) rather than emitting free text
