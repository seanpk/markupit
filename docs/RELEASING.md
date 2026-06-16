# Releasing

`@seanpk/markupit` publishes to npm automatically when a **GitHub Release** is
published. The release workflow (`.github/workflows/release.yml`) verifies the
tag matches `package.json`, runs lint + the full test suite, and publishes with
**provenance** via **npm Trusted Publishing (OIDC)** — there is no `NPM_TOKEN`
secret to manage.

## One-time setup (npm trusted publisher)

On npmjs.com → the `@seanpk/markupit` package → **Settings → Trusted Publishing**,
add a GitHub Actions publisher:

- Repository: `seanpk/markupit`
- Workflow filename: `release.yml`
- Environment: _(leave blank)_

Until this is configured, the publish step will fail with an auth error.

## Cutting a release

Master is protected (no direct pushes), so the version bump goes through a PR:

1. **Bump the version** on a branch (no tag yet):
   ```bash
   git checkout -b chore/release-vX.Y.Z
   npm version <patch|minor|major> --no-git-tag-version
   git commit -am "chore(release): vX.Y.Z"
   git push -u origin chore/release-vX.Y.Z
   gh pr create --fill --base master
   ```
   Merge the PR (squash) once CI is green.

2. **Publish a GitHub Release** targeting `master`:
   ```bash
   git fetch origin master
   gh release create vX.Y.Z --target master --title vX.Y.Z --generate-notes
   ```
   (Tags/releases are not blocked by branch protection.) The tag **must** be
   `v` + the version you bumped to, or the workflow's guard fails.

3. The **Release** workflow runs and publishes `@seanpk/markupit@X.Y.Z` to npm.
   Confirm with `npm view @seanpk/markupit version`.

## Notes

- **Why a Release, not "publish on merge to master"?** Merges happen for docs
  and refactors too; tying publishes to an explicit Release keeps versions
  intentional and avoids "version already exists" failures.
- **Token fallback.** If you ever prefer a token over OIDC, create an npm
  *automation* token, add it as the `NPM_TOKEN` repo secret, set
  `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` on the publish step, and drop the
  `npm install -g npm@latest` line. Provenance still works (it uses
  `id-token: write`, not the token).
