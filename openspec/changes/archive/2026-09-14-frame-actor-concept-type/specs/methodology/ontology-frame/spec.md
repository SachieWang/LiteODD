## MODIFIED Requirements

### Requirement: Generic concept type set
The frame SHALL define exactly nine generic concept types as the minimum spine: `Assembly` (how a system is composed/layered), `Component` (what a system is decomposed into), `Seam` (a replaceable port-adapter boundary with contract/providers/consumers), `ExecutionUnit` (a triggerable, bounded, side-effecting unit of work), `PersistentState` (state that must be reconstructable/traceable), `EventStream` (producers/observers/ordering), `ContextBoundary` (an isolation/scope boundary), `Rule` (a versioned rule, constraint, or procedure that constrains other concepts), and `Actor` (a human, role, or organizational actor that executes or participates in execution units and is subject to rules).

#### Scenario: All nine types present
- **WHEN** an agent inspects the meta ontology frame
- **THEN** it lists exactly the nine concept types named above and no others

## ADDED Requirements

### Requirement: Actor concept type
The ontology frame SHALL include an `Actor` concept type for human, role, and organizational actors that execute or participate in execution units and are subject to rules, instantiable like the others via `instantiateOf`.

#### Scenario: A role instantiates as Actor
- **WHEN** a maintenance crew member or role is declared in a target ontology
- **THEN** it carries `instantiateOf: Actor` and its participation in an execution is expressed separately from the execution unit itself

#### Scenario: Actor is distinct from ExecutionUnit
- **WHEN** a concept expresses who performs or participates in work rather than a bounded unit of work itself
- **THEN** it is modeled as `Actor` rather than `ExecutionUnit`
