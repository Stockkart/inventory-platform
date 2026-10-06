# Deploying the frontend

Everything deploys through GitHub Actions. Vercel's Git integration is **not**
connected to this repository; the pipeline builds in Actions and uploads the
result with the Vercel CLI. There are two Vercel projects:

| Environment | Vercel project                                                                                         | URL variable | Deployed by                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------ | ------------ | ----------------------------------------------------------------------------------- |
| staging     | staging project (`VERCEL_PROJECT_ID` of the `staging` GitHub environment)                              | `WEB_URL`    | every merge to `main`; any PR labelled `deploy:staging`                             |
| production  | production project (`VERCEL_PROJECT_ID` of the `production` / `production-manual` GitHub environments) | `WEB_URL`    | every merge to `main` after staging is verified; `promote-to-production` (approval) |

In Vercel's vocabulary each project's main domain is its "production" target, so
the pipeline always deploys with `--prod`; which real environment that is depends
only on the project id. Build-time variables (`VITE_API_URL`,
`VITE_GOOGLE_CLIENT_ID`, …) live in each Vercel project's settings and are pulled
by `vercel pull`; the pipeline adds `VITE_BUILD_SHA=<commit>`, which
`apps/inventory/app/root.tsx` renders as `<meta name="build-sha">` so the deploy
can be verified.

## The normal release

1. A pull request is merged to `main` (branch protection: PR + green CI).
2. `Release` workflow: test/build/typecheck → build + deploy to the staging project →
   verify → build + deploy to the production project → verify. No approval step;
   merging is the decision to ship.
3. "Verify" means the pipeline fetches the environment's `WEB_URL` and checks the
   page carries `<meta name="build-sha" content="<sha>">`. If staging fails,
   production is not touched.
4. Each deploy writes a summary (sha, previous sha, Vercel deployment link). The
   repo's **Environments** page shows "what is where".

Backend and frontend release independently. When a change needs both, merge the
backend PR first, wait for its release run to go green, then merge the frontend PR.

## Trying a branch on staging

Add the label `deploy:staging` to the pull request. The PR's head commit is built
and deployed to the staging project; a comment on the PR shows the sha and links,
and is updated on every push while the label stays on. Remove the label to stop.

Staging is shared and newest wins: a newer push cancels an older staging deploy job
and deploys itself. The next merge to `main` takes staging back. Pull requests from forks cannot be deployed (fork workflows get no secrets).
Branch deploys never reach production.

## Promoting a pull request to production (hotfix path)

Once the PR is on staging and you have tested it, add the label **`deploy:production`**.
The **PR → production** workflow:

1. checks that staging is _currently serving that exact commit_ (so staging cannot
   be skipped);
2. comments on the PR with a link to the "Review deployments" button and waits for
   a reviewer of the `production-manual` environment;
3. builds for the production project, deploys, verifies, then removes the label and
   comments with the result.

Production is then running an unmerged commit: merge the PR soon, because any other
merge to `main` would replace it.

## Putting an arbitrary commit in production (rollback, re-deploy)

Actions → **promote-to-production** → Run workflow, with the full 40-character
`sha` and a `reason`. The workflow checks the commit exists, deploys it to
**staging** and verifies it there, then waits for a reviewer of the
`production-manual` environment to approve, then builds for production, deploys
and verifies.

Only commits that render the `build-sha` meta tag (everything from the pipeline
commit onwards) can be promoted; older commits cannot be verified and are refused up
front. The deploy scripts are always taken from the workflow's own commit, so an
older application commit is deployed with current tooling.

Rule with no exceptions: **nothing reaches production without having been verified
on staging first** — a merge to `main` does both in one run, the PR label requires
staging to be serving that commit, and promote deploys to staging before asking for
approval.

## Rolling back

Open the last successful production run; its summary ends with
`Rollback: run promote-to-production with sha=<previous>`. Run promote with that
sha and a reason such as `rollback: <what broke>`. Approve.

## Running the deploy scripts by hand

```bash
pnpm install --frozen-lockfile
npm i -g vercel@62.2.0
export VERCEL_TOKEN=… VERCEL_ORG_ID=… VERCEL_PROJECT_ID=<staging or prod project>
scripts/deploy/vercel-deploy.sh <sha>            # pull → build → deploy --prebuilt --prod
scripts/deploy/verify-frontend.sh https://<host> <sha> 5
```

`vercel pull` writes `.vercel/` (git-ignored). Run from the repository root.

## GitHub configuration this relies on

| Environment         | Reviewers                          | Deployment branches | Secrets        | Variables                                        |
| ------------------- | ---------------------------------- | ------------------- | -------------- | ------------------------------------------------ |
| `staging`           | none                               | any                 | `VERCEL_TOKEN` | `VERCEL_PROJECT_ID` (staging project), `WEB_URL` |
| `production`        | none                               | `main` only         | `VERCEL_TOKEN` | `VERCEL_PROJECT_ID` (prod project), `WEB_URL`    |
| `production-manual` | team `stockkart-release-approvers` | any                 | `VERCEL_TOKEN` | `VERCEL_PROJECT_ID` (prod project), `WEB_URL`    |

Repository variables: `VERCEL_ORG_ID`; optional `VERCEL_CLI_VERSION` (default `62.2.0`).
Labels: `deploy:staging`, `deploy:production` (kept in sync from `.github/labels.yml`).

`production` and `production-manual` point at the same Vercel project; two
environments exist only because GitHub attaches reviewers per environment. The
`main`-only branch rule on `production` is what keeps a branch commit from
skipping the approval.

Vercel side, once: disconnect Git from both projects (Settings → Git), create a
token, note the org id and both project ids, confirm each project's build-time
variables. Secret scanning and push protection are enabled on the repository, and
`CI hygiene` fails any PR that tracks a `.env` file.

## Workflows

| File                                    | Trigger                                              | Purpose                                                    |
| --------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| `release.yml`                           | push to `main`                                       | test → staging → production                                |
| `branch-staging.yml`                    | PR labelled `deploy:staging` / pushes while labelled | PR head → staging → PR comment                             |
| `promote.yml`                           | manual                                               | any commit → production, with approval                     |
| `ci-hygiene.yml`                        | PR, push to `main`                                   | actionlint, shellcheck, no `.env`                          |
| `_deploy.yml`                           | called by the above                                  | the one build-and-deploy job, parameterised by environment |
| `ci.yml`, `eslint.yml`, `format.yml`, … | PR                                                   | unchanged existing checks                                  |
