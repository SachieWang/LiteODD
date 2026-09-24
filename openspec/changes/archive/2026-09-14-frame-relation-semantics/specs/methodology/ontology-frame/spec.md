## ADDED Requirements

### Requirement: Relation types carry semantics and direction
Each relation type declared in the ontology frame SHALL carry an optional one-line description of its meaning and a subject-to-object direction convention, so that relationship expressions using it are consistent across authors and targets instead of being an opaque id list.

#### Scenario: Semantics and direction recorded
- **WHEN** an author reads a relation type in the frame
- **THEN** it has a `description` stating what the relation means and a `direction` stating which endpoint is the subject and which is the object

#### Scenario: Existing ids unchanged
- **WHEN** the frame is updated
- **THEN** the eight relation id values (`composes`, `providedBy`, `usedBy`, `triggers`, `writes`, `reads`, `dependsOn`, `constrains`) remain unchanged and no relation is removed
