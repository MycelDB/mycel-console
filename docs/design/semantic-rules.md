# Semantic Rules console

Semantic rule administration is a list-first Intelligence workflow:

- `/intelligence/semantic-rules` lists rules and their concise reliability, index, and usage state.
- `/intelligence/semantic-rules/new` creates a rule from deterministic defaults.
- `/intelligence/semantic-rules/:ruleId` loads and edits a rule by its authoritative identity.

The list page owns filters and explicit management operations such as enable/disable, backfill, analyze, and delete. Editor-only dependencies, including inference profiles and the vector-store catalog, load only on create and edit routes. Editors validate before saving, preserve UUID-backed vector-store references and typed trigger events, and warn before discarding unsaved changes.

Semantic search is not part of rule administration. Lexical and semantic-assisted search controls remain under the top-level **Search** feature.

The retired `/intelligence/semantic` route has no compatibility redirect.
