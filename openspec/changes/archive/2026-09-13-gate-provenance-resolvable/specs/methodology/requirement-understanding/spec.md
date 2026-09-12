## ADDED Requirements

### Requirement: Source is a resolvable reference
The requirements-understanding skill SHALL emit each requirement's `source` as a resolvable reference — either `file:<repo-relative path>` (which must exist) or a source id registered in the target project's `ontology/sources.yaml` — and SHALL NOT emit free-text source labels, so provenance can be machine-verified.

#### Scenario: Emits a resolvable source
- **WHEN** the skill produces a requirement item from a document or a conversation
- **THEN** its `source` is a `file:` path that exists or a registered source id

#### Scenario: Free-text source is refused
- **WHEN** the only available provenance is an unrecorded label
- **THEN** the skill registers a described source entry (or cites an existing file) rather than emitting free text
