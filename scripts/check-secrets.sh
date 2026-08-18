#!/usr/bin/env bash
# Fail if anything credential-shaped is tracked in git.
#
# Exists because a real .env — Supabase URL and anon key — was committed in this
# repository's first commit. It is long gone from the working tree, but a secret
# that reaches history can only really be dealt with by rotating it, so the
# cheaper win is making sure it never happens again.
#
# Deliberately pattern-based and dependency-free: it runs in CI in under a
# second and needs no account, unlike the third-party scanners it complements.

set -uo pipefail

fail=0

note() { printf '  \033[31m✗\033[0m %s\n' "$1"; fail=1; }
pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; }

echo "Checking tracked files for credentials…"

# 1. A .env must never be tracked. .env.example is the one that ships.
if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  note '.env is tracked — it must be gitignored, and the key in it rotated'
else
  pass '.env is not tracked'
fi

# 2. Values that look like real credentials. Placeholders in .env.example and
#    the CI workflow are expected, so those are excluded by name rather than by
#    weakening the pattern.
matches=$(
  git ls-files -z \
    | grep -zZv -e '^\.env\.example$' -e '^scripts/check-secrets\.sh$' \
    | xargs -0 grep -nEI \
        -e 'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}' \
        -e 'sb_(publishable|secret)_[A-Za-z0-9_-]{20,}' \
        -e 'service_role.*eyJ' \
      2>/dev/null \
    | grep -vE 'placeholder|your-|example\.supabase|EXAMPLE' \
    || true
)

if [ -n "$matches" ]; then
  note 'credential-shaped values found in tracked files:'
  printf '%s\n' "$matches" | sed 's/^/      /' | head -20
else
  pass 'no credential-shaped values in tracked files'
fi

echo
if [ "$fail" -ne 0 ]; then
  echo "A secret that reaches git history cannot be removed by deleting it later."
  echo "Rotate the credential first, then remove it from the tree."
  exit 1
fi

echo "Clean."
