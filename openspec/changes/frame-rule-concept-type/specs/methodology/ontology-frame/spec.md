## ADDED Requirements

### Requirement: Rule concept type
The ontology frame SHALL include a `Rule` concept type for versioned rules, constraints, and procedures that constrain other concepts (for example a maintenance safety procedure that constrains a work order), and this type SHALL be instantiable like the others via `instantiateOf`.

#### Scenario: A procedure instantiates as Rule
- **WHEN** a safety procedure is declared in a target ontology as a concept that constrains an execution unit
- **THEN** it carries `instantiateOf: Rule` and its constraining role is expressed through the `constrains` relation

#### Scenario: Existing types unchanged
- **WHEN** the frame is updated
- **THEN** the seven existing concept types remain declared and none is removed
