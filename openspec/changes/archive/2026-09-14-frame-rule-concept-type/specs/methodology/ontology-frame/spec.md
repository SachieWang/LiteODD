## MODIFIED Requirements

### Requirement: Generic concept type set
The frame SHALL define exactly eight generic concept types as the minimum spine: `Assembly` (how a system is composed/layered), `Component` (what a system is decomposed into), `Seam` (a replaceable port-adapter boundary with contract/providers/consumers), `ExecutionUnit` (a triggerable, bounded, side-effecting unit of work), `PersistentState` (state that must be reconstructable/traceable), `EventStream` (producers/observers/ordering), `ContextBoundary` (an isolation/scope boundary), and `Rule` (a versioned rule, constraint, or procedure that constrains other concepts).

#### Scenario: All eight types present
- **WHEN** an agent inspects the meta ontology frame
- **THEN** it lists exactly the eight concept types named above and no others

## ADDED Requirements

### Requirement: Rule concept type
The ontology frame SHALL include a `Rule` concept type for versioned rules, constraints, and procedures that constrain other concepts (for example a maintenance safety procedure that constrains a work order), and this type SHALL be instantiable like the others via `instantiateOf`.

#### Scenario: A procedure instantiates as Rule
- **WHEN** a safety procedure is declared in a target ontology as a concept that constrains an execution unit
- **THEN** it carries `instantiateOf: Rule` and its constraining role is expressed through the `constrains` relation

#### Scenario: Rule is distinct from PersistentState
- **WHEN** a concept expresses an obligation that constrains behaviour rather than data that is read or written
- **THEN** it is modeled as `Rule` rather than `PersistentState`
