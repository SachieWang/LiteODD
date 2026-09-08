## Purpose

Defines the two-realm (meta vs object) placement layout and the rules that keep methodology products separate from target-project products, so the toolkit stays generic while remaining reusable, self-evolving, controllable, and traceable across any project.

## ADDED Requirements

### Requirement: Two-realm separation
The methodology workspace SHALL keep two distinct realms: a meta realm holding the ontology frame, the four meta-model schemas, skills, methods, and methodology-internal changes; and per-target-project object realms holding that project's ontology instances, component index, and its ADRs/reports/domain models/requirements. No product of one realm SHALL be placed in the other.

#### Scenario: Meta and object products land separately
- **WHEN** a new file is added to the workspace
- **THEN** it is classified as a meta (generic/reusable) or object (target-project) product and placed in the matching realm directory, never in a single loose pile

### Requirement: The target project object realm
The first target project, deepseek-harness, SHALL have an object realm containing `ontology/instances.yaml` (the spine instances e.g. `sp:capability-seam`, `sp:turn`, `sp:session-log`, each with an `instantiateOf` link) and `ontology/components.yaml` (a thin index of its package groups, each mapped to a spine instance), plus an `artifacts/` tree for ADRs, architecture reports, domain models, and requirements.

#### Scenario: Capability-seam trace chain
- **WHEN** a report about deepseek-harness's capability-seam is created
- **THEN** it carries a `conceptRef` to `sp:capability-seam`, whose `instantiateOf` resolves to `frame#Seam`, forming a resolvable frame-to-instance-to-artifact chain

### Requirement: Connection uses only two grips
The connection between the two realms SHALL use exactly two mechanisms: schema compliance (object artifacts conform to the meta-layer schemas) and `conceptRef` resolution (object concepts resolve within the project instance file). No other linking system is required.

#### Scenario: Two-grip validation
- **WHEN** an object artifact is validated against the meta layer
- **THEN** only schema compliance and conceptRef resolution are required to pass; no additional registry or linking service is consulted

### Requirement: Methodology self-evolution is meta-only
Feedback/reuse/harnessing of the methodology SHALL concern the meta realm; target-project products feed the meta realm only by surfacing new generic types into the frame, recorded as methodology-internal change artifacts.

#### Scenario: New generic type enters frame via change
- **WHEN** analyzing deepseek-harness reveals a still-generic pattern absent from the frame
- **THEN** it is added to the frame as a generic type through a methodology change, not as a target-project artifact
