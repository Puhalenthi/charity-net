#!/usr/bin/env bash
# Add the custom domain(s) to Firebase Auth's "Authorized domains" list, which
# Google sign-in and email links check the page origin against. Idempotent:
# existing entries are kept and nothing is duplicated.
#
# Usage:
#   ./scripts/authorizeDomains.sh                         # the defaults below
#   ./scripts/authorizeDomains.sh example.org www.example.org
#
# Needs gcloud signed in as a project owner/editor (gcloud auth login).
set -euo pipefail

PROJECT="${PROJECT:-charity-net-c4474}"
if [ "$#" -gt 0 ]; then
  DOMAINS=("$@")
else
  DOMAINS=("storageauctionconnect.org" "www.storageauctionconnect.org")
fi

command -v gcloud >/dev/null || { echo "Missing gcloud"; exit 1; }
command -v python3 >/dev/null || { echo "Missing python3"; exit 1; }

TOKEN="$(gcloud auth print-access-token)"
URL="https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT/config"
HDRS=(-H "Authorization: Bearer $TOKEN" -H "X-Goog-User-Project: $PROJECT" -H "Content-Type: application/json")

CURRENT="$(curl -fsS "${HDRS[@]}" "$URL")"
BODY="$(printf '%s' "$CURRENT" | python3 -c '
import json, sys
cfg = json.load(sys.stdin)
domains = cfg.get("authorizedDomains", [])
for d in sys.argv[1:]:
    if d not in domains:
        domains.append(d)
print(json.dumps({"authorizedDomains": domains}))
' "${DOMAINS[@]}")"

curl -fsS -X PATCH "${HDRS[@]}" "$URL?updateMask=authorizedDomains" -d "$BODY" \
  | python3 -c 'import json,sys; print("Authorized domains:", ", ".join(json.load(sys.stdin)["authorizedDomains"]))'
