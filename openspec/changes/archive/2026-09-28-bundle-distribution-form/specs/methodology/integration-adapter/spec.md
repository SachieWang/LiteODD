## ADDED Requirements

### Requirement: Distribution-form independence of the bundle
The resident bundle's patch rows SHALL reference the plugin by package name (`dsh-methodology-adapter`) rather than a relative source path, so the same patch layer is correct under both development (linked checkout) and distributed (git spec or npm registry) installations, and installing the bundle creates no binding to the source repository's directory location.

#### Scenario: Linked checkout resolves by package name
- **WHEN** the bundle is installed with `dsh plugin --profile <name> add ./meta/integrations/dsh/bundle`
- **THEN** the profile's node_modules links the package and the patch row resolves by package name at boot

#### Scenario: Distributed install is location-independent
- **WHEN** the bundle is installed from a git spec or npm registry into a profile
- **THEN** the plugin code is copied into the profile's package store and no reference to any source checkout path remains

### Requirement: Missing-toolbox error points to installation
When the adapter cannot resolve a methodology repository root, its error message SHALL point to the remedy (install the methodology toolbox first, then pass `repo:` referencing that installation), in both the dynamic and resident forms.

#### Scenario: Actionable failure
- **WHEN** no candidate directory contains `meta/integrations/gateway.py`
- **THEN** the error lists the candidates and tells the user to install the toolbox and pass `repo:` explicitly
