# ontology-frame Specification

## Purpose

Defines the meta-layer generic ontology frame: the concept types, relation types, and attributes every target project instantiates, plus the rule that generic types live in the meta layer while concrete instances live in the target project layer.

## Requirements

### Requirement: Generic concept type set
The frame SHALL define exactly seven generic concept types as the minimum spine: `Assembly` (how a system is composed/layered), `Component` (what a system is decomposed into), `Seam` (a replaceable port-adapter boundary with contract/providers/consumers), `ExecutionUnit` (a triggerable, bounded, side-effecting unit of work), `PersistentState` (state that must be reconstructable/traceable), `EventStream` (producers/observers/ordering), and `ContextBoundary` (an isolation/scope boundary).

#### Scenario: All seven types present
- **WHEN** an agent inspects the meta ontology frame
- **THEN** it lists exactly the seven concept types named above and no others

### Requirement: Generic relation type set
The frame SHALL define a relation type set including `composes`, `providedBy`, `usedBy`, `triggers`, `writes`, `reads`, `dependsOn`, and `constrains`, usable between the concept types.

#### Scenario: Relation types accepted
- **WHEN** an instance declares a relationship between two concepts
- **THEN** the relationship MUST use a relation type from the frame's set, or the instance is rejected as non-compliant

### Requirement: Lightweight per-type attributes
Each concept type SHALL carry a small optional set of typical attributes (for example `Seam` has `contract`, `providers`, `consumers`) that instances may fill; the frame does NOT mandate completeness of attributes.

#### Scenario: Attribute optionality
- **WHEN** an instance omits a per-type attribute
- **THEN** the omission is valid as long as the required identifying fields and the `instantiateOf` reference are present

### Requirement: Type/instance separation
The frame SHALL declare only generic types in the meta layer; concrete project concepts (for example `sp:capability-seam`, `sp:turn`) SHALL NOT appear in the frame but SHALL live in the target project instance file and each declare an `instantiateOf` link to a frame type.

#### Scenario: No project-specific name in frame
- **WHEN** an agent checks the frame for a project-specific term such as `capability-seam` or `turn`
- **THEN** the term is absent from the frame; instead the frame contains the generic type they instantiate (`Seam`, `ExecutionUnit`)

#### Scenario: Every instance has a type
- **WHEN** the compliance checker scans a target project's instance file
- **THEN** every instance has a resolvable `instantiateOf` pointing to an existing frame type, or the checker reports it as non-compliant
