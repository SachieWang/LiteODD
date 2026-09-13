## ADDED Requirements

### Requirement: Component entry path is optional
The object-realm components index SHALL treat each entry's `ref` as the required, machine-checkable binding, and SHALL make `path` optional with a documented meaning covering both a code path and, for non-software realms, a logical locator (or omission), so component indexes work for non-software targets instead of forcing a fabricated path.

#### Scenario: A component without a code path
- **WHEN** a target is a non-software domain whose components have no code path
- **THEN** its component entries may omit `path` or use a logical locator, and `ref` alone keeps the entry compliant

#### Scenario: Ref remains required
- **WHEN** a component entry omits `ref` or its `ref` does not resolve to an instance
- **THEN** the structure gate still reports it as non-compliant
