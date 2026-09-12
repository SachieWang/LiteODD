## ADDED Requirements

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
