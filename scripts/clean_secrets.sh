#!/usr/bin/env bash
set -euo pipefail

# Attempt to remove .env.local from git history using git-filter-repo if available.
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "This script must be run from inside a git repository root." >&2
  exit 1
fi

if command -v git-filter-repo >/dev/null 2>&1; then
  echo "Using git-filter-repo to remove .env.local from history..."
  git filter-repo --invert-paths --path .env.local
else
  echo "git-filter-repo not found. Try installing with: pip install git-filter-repo"
  echo "Or use BFG repo cleaner as an alternative: https://rtyley.github.io/bfg-repo-cleaner/"
  exit 2
fi

echo "Cleaning reflog and running garbage collection..."
git reflog expire --expire=now --all || true
git gc --prune=now --aggressive || true

echo "Done. You must force-push the rewritten history to remote when ready:"
echo "  git push --force --all"
echo "  git push --force --tags"

echo "ROTATE any exposed secrets (Vercel, DB, SMTP) immediately."
