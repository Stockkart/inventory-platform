# Contributing to Inventory Platform

## Pull requests

1. Open a PR against `main` from a focused branch.
2. Fill the **PR template** (Summary + Test plan are required by CI).
3. Use a **Conventional Commits** title, e.g.:
   - `feat(product): add stock correction filter`
   - `fix(shell): stop notification panel clipping`
   - `style(analytics): fix chart container height`
   - `chore(ci): add PR labeler`
4. Wait for CI: ESLint, Prettier, typecheck/build, PR title, PR description.
5. Path-based **labels** apply automatically (`module:product`, `area:ui-kit`, …). Size labels (`size:S` … `size:XL`) tip when a PR should be split.

### Title format

```text
type(optional-scope): short description
```

Allowed types: `feat`, `fix`, `refactor`, `perf`, `style`, `docs`, `test`, `chore`, `ci`, `revert`.

Scopes should match a module when possible: `product`, `shell`, `ui-kit`, `analytics`, `user`, `cafe`, …

### What reviewers look for

- Clear **why** in Summary (not a dump of filenames)
- Correct domain ownership (see package READMEs under `core/`, `platform/`, `plugins/`)
- ui-kit primitives / `*Chrome` instead of one-off HTML/CSS
- In-app `Button variant="solid"` (not gradient `brand` unless marketing)
- Screenshots for UI
- No secrets committed

### Large PRs

Prefer one domain or one concern per PR. `size:L` / `size:XL` labels are a signal to split (e.g. ui-kit chrome vs domain wiring).

## Local checks (before push)

```sh
pnpm exec lint-staged          # via husky pre-commit
pnpm run format:check
pnpm exec nx run-many -t lint typecheck --projects=tag:type:core
```

Or target what you touched:

```sh
pnpm exec nx lint product
pnpm exec nx typecheck product
```

## Branch protection (maintainers)

In GitHub → Settings → Branches → rules for `main`, enable:

| Rule                                  | Value                                                                |
| ------------------------------------- | -------------------------------------------------------------------- |
| Require a pull request before merging | On                                                                   |
| Require approvals                     | ≥ 1 (2 for `area:ui-kit` / auth if desired)                          |
| Require status checks                 | `CI`, `ESLint`, `Format`, `PR Title`, `PR Description`, `PR Labeler` |
| Require conversation resolution       | On                                                                   |
| Do not allow bypassing the above      | On for everyone except emergency admins                              |

After the first merge of `.github/labels.yml`, run **Actions → Sync labels → Run workflow** once so module labels exist, then open a test PR to confirm auto-labeling.

## CODEOWNERS

`.github/CODEOWNERS` maps paths to review teams. Replace `@your-org/stockkart-frontend` with real GitHub teams/users before relying on automatic review requests.
