# React coding guidelines

This document defines the organization and responsibility model for React
applications in Mycel Console. It is intended to make code easier to navigate, test,
review, and change across independently maintained products.

The guide applies to new React code and to existing React code when it is
changed. It does not authorize unrelated repository-wide reorganizations.

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY**
describe requirement strength:

- **MUST** and **MUST NOT** are requirements. An exception needs an explicit,
  documented reason.
- **SHOULD** and **SHOULD NOT** are defaults. A change may depart from them when
  the trade-off is documented and reviewed.
- **MAY** identifies an optional practice.

## 2. Architectural principles

React applications MUST be organized primarily by feature or business domain,
not as one application-wide collection of pages, components, hooks, and
services.

Within a feature:

- Pages own route-level composition and application orchestration.
- Components primarily render state received through props.
- Hooks and controllers coordinate reusable UI workflows.
- API modules own transport calls and transport mapping.
- Model modules own pure domain rules, reducers, selectors, and transformations.
- Providers own intentionally shared React state or capability scope.

Code that is genuinely reusable across features belongs in `shared`. Code MUST
NOT be moved into `shared` merely because it might become reusable later.

## 3. Standard source structure

Applications SHOULD use this structure unless a framework imposes an equivalent
route layout:

```text
src/
  app/
    routes/
    providers/

  features/
    <feature>/
      pages/
        <PageName>/
          <PageName>.tsx
          <PageName>.test.tsx
          index.ts

      components/
        <ComponentName>/
          <ComponentName>.tsx
          <ComponentName>.test.tsx
          index.ts

      hooks/
      api/
      model/
      providers/
      types/
      index.ts

  shared/
    components/
      <ComponentName>/
        <ComponentName>.tsx
        <ComponentName>.test.tsx
        index.ts
    hooks/
    lib/
    types/
```

Not every feature needs every directory. Empty placeholder directories SHOULD
NOT be committed.

Framework-generated route files MAY remain in framework-defined locations. Such
route files SHOULD be thin adapters that render the feature page rather than
becoming a second implementation of the page.

## 4. Feature boundaries

A feature represents a coherent user or business capability, such as
authentication, journal editing, search, billing, or workspace management.

A feature:

- MUST keep its private implementation below its own directory.
- MAY import from `shared`.
- MAY import from its own modules.
- MUST NOT import from `app`.
- MUST NOT reach into another feature's private directories.
- MAY consume another feature through that feature's intentional public API when
  the dependency is necessary and reviewed.

Each feature SHOULD expose a small public API from
`features/<feature>/index.ts`. The public API SHOULD export only capabilities
intended for cross-feature or application composition. It MUST NOT re-export
every internal module by default.

### 4.1 Import direction

The normal dependency direction is:

```text
app -> features -> shared
```

Permitted dependencies are:

- `app` may import feature public APIs and `shared`. It should not import
  feature-private internals when a public API exists.
- A feature may import itself, `shared`, and reviewed public APIs of other
  features. It must not import `app` or another feature's private internals.
- `shared` may import other `shared` modules. It must not import `app` or any
  feature.

Circular feature dependencies MUST be removed by changing ownership, extracting
a neutral shared abstraction, or routing composition through `app`.

## 5. Pages

A page is a route-level composition root or a page-equivalent surface explicitly
owned by navigation, such as a full-screen modal route.

Pages MUST live under:

```text
src/features/<feature>/pages/<PageName>/
```

A page MAY:

- Read and validate route parameters or query parameters.
- Navigate or create route destinations.
- Coordinate loading, empty, error, and success states.
- Invoke feature hooks or controllers.
- Select and compose feature components.
- Translate application state into component props.
- Coordinate page-level mutations and notifications.

A page SHOULD NOT:

- Implement low-level HTTP calls directly.
- Contain large reusable domain algorithms.
- Contain numerous independently useful visual components in the same file.
- Become the only place where business rules can be tested.

Pages own business **orchestration**, not all business **implementation**.
Reusable workflows belong in hooks or controllers; transport belongs in `api`;
pure business rules belong in `model`.

A preferred page shape is:

```tsx
export function WorkspaceSettingsPage() {
  const controller = useWorkspaceSettingsPage();

  return <WorkspaceSettingsView {...controller} />;
}
```

The page remains responsible for composition while the workflow and view can be
tested separately.

## 6. Components

Feature-specific components MUST live under:

```text
src/features/<feature>/components/<ComponentName>/
```

Cross-feature visual primitives MUST live under:

```text
src/shared/components/<ComponentName>/
```

Components SHOULD primarily render from props and emit user intent through
callbacks.

A component MAY own ephemeral presentation state, including:

- Focus or hover state.
- Whether a menu, tooltip, disclosure, or dialog is open.
- A local input draft before submission.
- Animation or transient interaction state.
- Measurement state used only for rendering.

A presentational component MUST NOT directly own:

- Route navigation or route policy.
- API or database calls.
- Durable persistence.
- Authentication or authorization decisions.
- Billing or privacy policy decisions.
- Multi-step business workflows.
- Cross-feature state mutation.

Those responsibilities belong in a page, controller hook, provider, API module,
or model module. Components SHOULD receive resulting data, status, permissions,
and callbacks through explicit props.

“Presentational” does not mean that a component must be stateless. It means the
component does not decide or execute application policy.

## 7. Hooks, controllers, API modules, and models

### 7.1 Hooks and controllers

Feature hooks MAY own reusable React orchestration, including requests,
cancellation, optimistic state, workflow transitions, and coordination with
feature providers.

Hooks that represent a page workflow SHOULD use a descriptive name such as
`useWorkspaceSettingsPage` or `useSearchController`.

Hooks MUST obey React's Rules of Hooks and SHOULD expose a narrow, typed
contract rather than leaking transport responses directly into many components.

### 7.2 API modules

API modules MUST live under the owning feature's `api` directory unless they are
genuinely application-wide infrastructure.

API modules SHOULD:

- Own transport calls and request/response mapping.
- Accept cancellation signals when operations are cancellable.
- Return typed application-facing results.
- Avoid React imports.

API modules MUST NOT contain rendering or route navigation.

### 7.3 Model modules

Model modules SHOULD contain pure functions wherever practical. Typical
responsibilities include:

- Validation and normalization.
- Reducers and state machines.
- Selectors and derived state.
- Domain policy evaluation.
- Sorting, grouping, and transformations.

Model tests SHOULD run without rendering React.

## 8. Providers and contexts

Context is an application-state mechanism, not a visual component category.

Feature providers MUST live in a consistent location such as:

```text
src/features/<feature>/providers/
```

Application-wide provider composition belongs under:

```text
src/app/providers/
```

Providers MAY coordinate state and effects that are intentionally shared by a
subtree. They SHOULD expose the smallest stable contract needed by consumers.

Providers MUST NOT silently become service locators for unrelated capabilities.
A provider that grows into several independent workflows SHOULD be split by
responsibility or moved behind dedicated controller hooks.

Provider tests SHOULD verify lifecycle, scope changes, cancellation, and failure
behavior independently from page rendering where possible.

## 9. Colocation and unit directories

Every page and every non-trivial component MUST have its own directory. Tests,
stories, fixtures, styles, and private helpers SHOULD be colocated with the unit
that owns them.

Example:

```text
components/
  JournalEntry/
    JournalEntry.tsx
    JournalEntry.test.tsx
    JournalEntry.fixtures.ts
    JournalEntry.module.css
    index.ts
```

Private subcomponents used only by one parent MAY remain in the parent's
directory. When a subcomponent has independent behavior, substantial rendering,
its own tests, or reuse by multiple parents, it SHOULD receive its own
directory.

### 9.1 Lightweight primitive exception

A reviewed repository convention MAY keep very small design-system or
HTML-wrapper primitives as one file per primitive in a single directory when all
of the following are true:

- The primitive is essentially a typed styling wrapper.
- It has no application or feature dependency.
- It has no substantial private helpers or fixtures.
- A dedicated directory would add navigation overhead without improving
  ownership.

The exception MUST NOT be used for feature components, pages, workflow
components, or components with substantial tests and supporting files.

## 10. Shared code

`shared` is for code whose ownership is intentionally cross-feature.

Appropriate shared code includes:

- Design-system primitives.
- Generic layout and accessibility components.
- Framework-independent utility functions.
- Cross-cutting hooks with no feature policy.
- Common foundational types.

Code SHOULD remain in its feature until it has a demonstrated cross-feature use
or a clear foundational responsibility.

Shared code:

- MUST NOT import feature modules.
- MUST NOT encode one feature's business policy behind a generic name.
- SHOULD have a stable and narrow API.
- SHOULD be reviewed for accessibility and theme compatibility when it renders
  UI.

A `shared` directory MUST NOT become a miscellaneous dumping ground. If
ownership is unclear, keep the code with the feature that currently owns the
behavior.

## 11. Naming and exports

- React component and page names MUST use PascalCase.
- Hooks MUST begin with `use`.
- Page names SHOULD end in `Page`.
- Provider components SHOULD end in `Provider`.
- Test filenames SHOULD identify the unit they test, normally
  `<UnitName>.test.tsx` or `<UnitName>.test.ts`.
- A page or component directory SHOULD expose its public unit through a local
  `index.ts`.
- Broad barrel files that create circular imports or obscure ownership SHOULD
  NOT be introduced.

Files SHOULD have one primary exported page, component, hook, or model
responsibility. Small private helpers are acceptable, but multiple independently
testable UI units SHOULD be split.

## 12. Testing responsibilities

Tests MUST follow responsibility boundaries:

- Component tests verify rendering, accessibility, local interaction state, and
  emitted callbacks.
- Hook/controller tests verify workflow state, request coordination,
  cancellation, retries, and errors.
- Model tests verify business rules and transformations without React.
- Page tests verify route integration, composition, and user-visible workflow
  outcomes.
- API tests verify request construction and response/error mapping.

Tests SHOULD be colocated with their owning unit. Shared test infrastructure MAY
live in an application-level test-support directory.

Splitting a legacy module MUST preserve its existing behavioral coverage. Tests
SHOULD be moved with the responsibility they verify rather than left attached to
an obsolete file boundary.

## 13. Examples of responsibility placement

- Reading `workspaceId` from the route belongs to a page.
- Navigating after successful creation belongs to a page or controller.
- Executing the create request belongs to an API module invoked by a controller.
- Validating a workspace name belongs to a model.
- Rendering form fields belongs to a component.
- Keeping a disclosure open or closed belongs to a component.
- Deciding whether the user is authorized belongs to application or feature
  policy, not the component.
- Rendering an already-computed permission state belongs to a component.
- Coordinating optimistic updates and rollback belongs to a hook or controller.
- Grouping and sorting display rows belongs to a model or selector when it
  expresses reusable rules.

A component receiving `canDelete` and `onDelete` is preferable to a component
that fetches permissions and calls the deletion endpoint itself.

## 14. Legacy code and incremental migration

All new pages and components MUST follow this guide.

When changing legacy code:

- The change SHOULD improve the touched boundary when the improvement is
  reasonably within scope.
- The change MUST NOT perform a broad unrelated reorganization without explicit
  approval.
- File moves and responsibility splits MUST preserve public behavior,
  accessibility, authorization, cancellation, and error handling.
- Existing tests MUST remain passing; missing coverage SHOULD be added before
  risky extraction.
- Mechanical moves SHOULD be separated from behavioral changes when that makes
  review safer.
- Repository-specific migration plans MAY sequence large modules over several
  changes.

A feature does not need to become fully compliant before a defect can be fixed.
Conversely, “legacy code” MUST NOT be used to justify adding new violations when
a compliant addition is practical.

Repository-specific exceptions MUST be documented near the repository's agent or
engineering instructions. An exception SHOULD identify its scope, reason, owner,
and intended review or removal condition.

## 15. Agent instructions

A consuming React repository SHOULD have a repository-root `AGENTS.md` that
instructs coding agents to read the local copy of this guide before planning or
modifying React code:

```md
## React engineering guidelines

Before planning or modifying React code, read and follow:

- `docs/guidelines/react_coding_guidelines.md`

Repository-specific exceptions are documented below. Do not perform broad
structural migrations unless the current task explicitly authorizes them.
```

The local `AGENTS.md` MAY add stricter repository-specific rules. It MUST NOT
silently weaken the MUST or MUST NOT requirements in this document. A necessary
exception must be explicit and reviewable.

## 16. Review checklist

For new or substantially changed React code, reviewers should ask:

- Is the code owned by the correct feature?
- Is route and workflow orchestration in a page or controller rather than a
  visual component?
- Are transport and pure domain rules outside JSX?
- Does each non-trivial page/component have an ownership directory with
  colocated tests?
- Are shared modules genuinely cross-feature and independent of feature
  internals?
- Do imports follow `app -> features -> shared`?
- Are providers narrowly scoped and placed consistently?
- Does the change avoid unrelated migration work?
- Are behavior and test coverage preserved?
