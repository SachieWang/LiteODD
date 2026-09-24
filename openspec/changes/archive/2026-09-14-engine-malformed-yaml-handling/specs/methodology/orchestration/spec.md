## ADDED Requirements

### Requirement: Malformed object-layer YAML reported as a readable gate error
When the engine reads an object-layer YAML file (instances, components, or sources) that fails to parse, it SHALL report a readable gate error naming the file and, when available, the line and cause, and SHALL NOT surface an uncaught parser traceback to the top level; the run still fails with an exit code of 1.

#### Scenario: Malformed YAML does not crash with a traceback
- **WHEN** an object-layer YAML file contains an unquoted colon or another parse error
- **THEN** the engine reports a FAIL naming the file (and line/cause when available) and exits 1 without an uncaught traceback

#### Scenario: Valid YAML is unaffected
- **WHEN** an object-layer YAML file is well formed
- **THEN** its parse and all gate determinations behave exactly as before
