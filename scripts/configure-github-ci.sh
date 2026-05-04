#!/usr/bin/env bash
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-Kelps-inc/Kget-Cloud}"
API_SERVICE="${RAILWAY_API_SERVICE:-api}"
WEB_SERVICE="${RAILWAY_WEB_SERVICE:-web}"

required_env=(
  RAILWAY_TOKEN
  DATABASE_URL
)

missing=()
for name in "${required_env[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    missing+=("$name")
  fi
done

if (( ${#missing[@]} > 0 )); then
  printf 'Missing required environment variables:\n' >&2
  printf '  - %s\n' "${missing[@]}" >&2
  printf '\nExport them locally before running this script. DATABASE_URL should be the Railway PostgreSQL DATABASE_PUBLIC_URL value.\n' >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  printf 'GitHub CLI is not authenticated. Run: gh auth login -h github.com -s repo,workflow\n' >&2
  exit 1
fi

printf 'Configuring GitHub Actions secrets for %s...\n' "$REPO"
gh secret set RAILWAY_TOKEN --repo "$REPO" --body "$RAILWAY_TOKEN"
gh secret set DATABASE_URL --repo "$REPO" --body "$DATABASE_URL"

printf 'Configuring GitHub Actions repository variables...\n'
gh variable set RAILWAY_API_SERVICE --repo "$REPO" --body "$API_SERVICE"
gh variable set RAILWAY_WEB_SERVICE --repo "$REPO" --body "$WEB_SERVICE"

contexts=(
  "Lint & Type-check"
  "API Tests (Bun)"
  "Web Tests (Bun)"
  "Rust Agent (cargo test)"
  "Railway Docker build"
)

contexts_json="$(printf '%s\n' "${contexts[@]}" | jq -R . | jq -s .)"

if [[ "${SKIP_BRANCH_PROTECTION:-0}" == "1" ]]; then
  printf 'Skipping branch protection because SKIP_BRANCH_PROTECTION=1.\n'
  printf 'GitHub CI/CD secrets and variables setup finished.\n'
  exit 0
fi

protect_branch() {
  local branch="$1"

  if ! gh api "repos/$REPO/branches/$branch" >/dev/null 2>&1; then
    printf 'Skipping branch %s: it does not exist on GitHub yet.\n' "$branch"
    return
  fi

  printf 'Applying branch protection to %s...\n' "$branch"
  if ! gh api \
    --method PUT \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "repos/$REPO/branches/$branch/protection" \
    --input - <<JSON
{
  "required_status_checks": {
    "strict": true,
    "contexts": $contexts_json
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": true
}
JSON
  then
    printf 'Branch protection for %s was not applied. This can require GitHub Pro or a public repository.\n' "$branch" >&2
    return
  fi
}

protect_branch main
protect_branch develop

printf 'GitHub CI/CD setup finished.\n'
