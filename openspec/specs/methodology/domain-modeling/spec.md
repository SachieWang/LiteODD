# domain-modeling Specification

## Purpose

Defines the business/domain-modeling skill contract: how requirements plus domain vocabulary become a domain model (entities, relationships, invariants, bounded contexts) that conforms to the meta-layer domain-model schema and aligns to the ontology spine.

## Requirements

### Requirement: Skill has a fixed five-part contract
The domain-modeling skill SHALL declare and expose a trigger condition, an input schema, an ordered step list, an output schema, and a quality gate, so any agent invoking it follows the same contract.

#### Scenario: Contract present when loaded
- **WHEN** an agent loads this skill
- **THEN** it finds explicit sections for trigger, input schema, steps, output schema, and quality gate

### Requirement: Concept extraction and entity alignment
The skill SHALL extract concepts from requirements in domain language, and align each extracted entity to a resolvable ontology instance, rather than inventing unanchored concepts.

#### Scenario: Entity carries a conceptRef
- **WHEN** the skill produces a domain model
- **THEN** every entity carries a `conceptRef` resolvable against the project instance file

### Requirement: Bounded contexts defined
The skill SHALL define bounded contexts and place entities within them, reflecting the meta-layer `ContextBoundary` type.

#### Scenario: Bounded contexts present
- **WHEN** the skill finalizes a domain model
- **THEN** the model includes one or more named bounded contexts

### Requirement: Relationships and invariants
The skill SHALL record relationships between entities and explicit invariants/constraints, so the model is expressive and testable.

#### Scenario: Relationships and invariants recorded
- **WHEN** the skill finalizes a domain model
- **THEN** the model lists relationships and invariants

### Requirement: Output conforms to domain-model schema
The produced domain model SHALL conform to `domain-model.schema.json` and carry `conceptRef` plus `meta.schemaVersion`.

#### Scenario: Schema-conformant output
- **WHEN** an agent validates the produced domain model
- **THEN** it conforms to the domain-model meta-schema and its `conceptRef` entries resolve

### Requirement: Quality gate = compliance plus resolution
The skill's quality gate SHALL run the meta-layer compliance checker over the model, and require all `conceptRef` entries to resolve within the project instance file.

#### Scenario: Gate blocks unresolved entities
- **WHEN** an entity's `conceptRef` fails to resolve or the model fails compliance
- **THEN** the skill reports it as failing the quality gate rather than releasing it
