## Summary

<!-- 1–3 bullets: what changed and why (not a file list). -->

-

## Module impact

<!-- Auto-labels also apply from paths. Call out anything surprising. -->

- [ ] `core/*` domain(s):
- [ ] `platform/*`:
- [ ] `ui-kit`:
- [ ] `plugins/*`:
- [ ] `apps/inventory`:
- [ ] Docs / CI / tooling only

## Type of change

- [ ] Feature
- [ ] Bug fix
- [ ] Refactor / cleanup
- [ ] UI / design polish
- [ ] Performance
- [ ] Tests
- [ ] Docs
- [ ] Chore (deps, CI, tooling)

## Test plan

<!-- Checklist of what you verified. Prefer concrete steps. -->

- [ ] Typecheck / lint locally (or CI green)
- [ ] Manual QA:
  - [ ]
- [ ] No new console errors on touched screens
- [ ] Mobile / narrow layout checked (if UI)

## Screenshots / recordings

<!-- Required for UI changes. Before/after if polishing existing screens. -->

|

## Risk & rollback

- **Risk:** Low / Medium / High —
- **Rollback:** Revert this PR / feature flag / —

## Checklist

- [ ] PR title follows Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `style:`, `test:`, `ci:`)
- [ ] Touched domains follow package README ownership boundaries
- [ ] Used ui-kit primitives / chrome (`*Chrome`) instead of one-off raw HTML/CSS where applicable
- [ ] In-app buttons use `variant="solid"` (not `brand`) unless marketing CTA
- [ ] No secrets, `.env`, or credentials committed
- [ ] README / docs updated if package ownership or public API changed
