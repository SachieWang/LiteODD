## ADDED Requirements

### Requirement: New concept is instantiated before it is referenced
When a requirement introduces a concept that has no resolvable instance in the target project's ontology, the requirements-understanding skill SHALL first add a resolvable instance anchored via `instantiateOf` to a meta-layer frame type, and only then produce the requirement item and its downstream artifacts; it SHALL NOT defer such a concept as pending. Deferral stays reserved for genuinely ambiguous or contradictory input: a concept that is clear but merely unregistered is instantiated, not flagged.

#### Scenario: New capability seam is instantiated first
- **WHEN** a raw requirement introduces a new capability seam whose term has no instance in the target's `ontology/instances.yaml`
- **THEN** an instance anchored to a meta-layer frame type is added first, and the produced requirement item carries a `conceptRef` that resolves against it, so the downstream domain model does not lag the requirement

#### Scenario: Genuine ambiguity flags instead of instantiating
- **WHEN** the input statement is ambiguous or self-contradictory rather than merely unregistered
- **THEN** the skill records a flagged uncertainty and does not silently instantiate a concept
