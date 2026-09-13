## ADDED Requirements

### Requirement: Actor concept type
The ontology frame SHALL include an `Actor` concept type for human, role, and organizational actors that execute or participate in execution units and are subject to rules, instantiable like the others via `instantiateOf`.

#### Scenario: A role instantiates as Actor
- **WHEN** an maintenance crew member or role is declared in a target ontology
- **THEN** it carries `instantiateOf: Actor` and its participation in an execution is expressed separately from the execution unit itself

#### Scenario: Existing types unchanged
- **WHEN** the frame is updated
- **THEN** the eight existing concept types remain declared and none is removed
