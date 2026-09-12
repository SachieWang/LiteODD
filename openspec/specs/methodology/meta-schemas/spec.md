# meta-schemas Specification

## Purpose

Defines the four meta-model JSON Schemas (requirement, adr, arch-report, domain-model) that give target-project artifacts their structure, plus the common invariants every artifact must satisfy and the single compliance checker behavior.

## Requirements

### Requirement: Four artifact schemas in the meta layer
The meta layer SHALL provide four JSON Schemas: `requirement.schema.json`, `adr.schema.json`, `arch-report.schema.json`, and `domain-model.schema.json`, each defining the required structure for the corresponding artifact type.

#### Scenario: Schema files exist
- **WHEN** an agent inspects the meta layer metaschema directory
- **THEN** it finds exactly those four schema files, one per artifact type

### Requirement: Mandatory conceptRef
Each of the four schemas SHALL include a `conceptRef` array field; an artifact is non-compliant if all of its `conceptRef` entries fail to resolve to instances in the same target project's instance file.

#### Scenario: Unresolvable conceptRef rejected
- **WHEN** a checker validates an artifact whose `conceptRef` points to a nonexistent project instance
- **THEN** the artifact is reported non-compliant

#### Scenario: Requirement carries source provenance
- **WHEN** validating a requirement artifact
- **THEN** a `source` field is present so the requirement can be traced to its origin, in addition to its `conceptRef` links

### Requirement: Common invariant metadata
Every artifact SHALL carry a `meta.schemaVersion`; an artifact lacking it is non-compliant, and this version is how the meta layer tracks its own evolution.

#### Scenario: Missing schemaVersion rejected
- **WHEN** a checker validates an artifact with no `meta.schemaVersion`
- **THEN** the artifact is reported non-compliant

### Requirement: Artifact-type-specific fields
The `adr` schema SHALL include `status` (proposed/accepted/superseded) and `supersedes` to form a decision chain; the `arch-report` schema SHALL include `targetRef` pointing to the assessed component or seam instance; the `domain-model` schema SHALL include `boundedContexts` and `invariants`.

#### Scenario: ADR decision chain
- **WHEN** validating an ADR artifact
- **THEN** its `status` is one of the allowed values and superseded records link the decisions it replaces

### Requirement: Single compliance checker
A single checker script SHALL evaluate every artifact against exactly three invariants (schemaVersion present, valid structure/enums, all conceptRef resolvable), with no dependency on databases, reasoning engines, or graph stores.

#### Scenario: One pass over three invariants
- **WHEN** the checker runs over a target project's artifact set
- **THEN** each artifact either passes all three invariants or is reported with the specific failing invariant

### Requirement: Provenance resolvability
Every requirement artifact's `source` SHALL be machine-verifiable: it SHALL be either a `file:<repo-relative path>` reference whose path exists, or a source id present in the target project's `ontology/sources.yaml` registry. A `source` that is neither SHALL make the artifact non-compliant, so fabricated provenance cannot pass the gate.

#### Scenario: File source is verified
- **WHEN** a requirement's `source` is `file:<path>` and that path exists in the repository
- **THEN** the provenance is accepted as resolvable

#### Scenario: Registered source is accepted
- **WHEN** a requirement's `source` names an id present in the target's `sources.yaml` registry
- **THEN** the provenance is accepted as resolvable

#### Scenario: Unverifiable source is rejected
- **WHEN** a requirement's `source` is free text that is neither an existing `file:` path nor a registered source id (e.g. a fabricated interview label)
- **THEN** the checker reports the artifact as non-compliant and it is not released
