#!/bin/sh
set -eu

usage() {
  cat <<'EOF'
Usage: scripts/sync-react-coding-guidelines.sh [--update|--check]

Synchronize the pinned company React coding guidelines.

Authentication, in precedence order:
  CI_JOB_TOKEN                   GitLab CI job token
  REACTICITY_ENGINEERING_TOKEN   Read-only GitLab project/deploy/access token

For local validation without network access, set
REACT_CODING_GUIDELINES_SOURCE_FILE to the canonical file to compare or copy.
EOF
}

mode="${1:---update}"
case "$mode" in
  --update|--check) ;;
  -h|--help)
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_root=$(CDPATH= cd -- "$script_dir/.." && pwd)
metadata_file="$repo_root/docs/guidelines/react_coding_guidelines.source.json"
destination="$repo_root/docs/guidelines/react_coding_guidelines.md"

if [ ! -f "$metadata_file" ]; then
  echo "React guideline provenance is missing: $metadata_file" >&2
  exit 1
fi

json_string() {
  key="$1"
  sed -n "s/^[[:space:]]*\"$key\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\"[[:space:]]*,\{0,1\}[[:space:]]*$/\1/p" "$metadata_file" | head -n 1
}

json_number() {
  key="$1"
  sed -n "s/^[[:space:]]*\"$key\"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\)[[:space:]]*,\{0,1\}[[:space:]]*$/\1/p" "$metadata_file" | head -n 1
}

source_base_url=$(json_string base_url)
source_project=$(json_string project)
source_project_id=$(json_number project_id)
source_path=$(json_string path)
source_version=$(json_string version)
source_ref=$(json_string ref)

if [ -z "$source_base_url" ] || [ -z "$source_project" ] || [ -z "$source_project_id" ] || [ -z "$source_path" ] || [ -z "$source_version" ] || [ -z "$source_ref" ]; then
  echo "React guideline provenance is incomplete: $metadata_file" >&2
  exit 1
fi

case "$source_ref" in
  *[!0-9a-f]*|'')
    echo "React guideline ref must be a lowercase hexadecimal commit SHA." >&2
    exit 1
    ;;
esac

if [ "${#source_ref}" -ne 40 ]; then
  echo "React guideline ref must be a full 40-character commit SHA." >&2
  exit 1
fi

mkdir -p "$(dirname -- "$destination")"
temporary=$(mktemp "${destination}.tmp.XXXXXX")
cleanup() {
  rm -f "$temporary"
}
trap cleanup 0 1 2 3 15

if [ -n "${REACT_CODING_GUIDELINES_SOURCE_FILE:-}" ]; then
  if [ ! -f "$REACT_CODING_GUIDELINES_SOURCE_FILE" ]; then
    echo "React guideline source file does not exist." >&2
    exit 1
  fi
  cp "$REACT_CODING_GUIDELINES_SOURCE_FILE" "$temporary"
else
  encoded_path=$(printf '%s' "$source_path" | sed 's|/|%2F|g')
  source_url="${source_base_url%/}/api/v4/projects/${source_project_id}/repository/files/${encoded_path}/raw?ref=${source_ref}"

  if [ -n "${CI_JOB_TOKEN:-}" ]; then
    auth_header="JOB-TOKEN: $CI_JOB_TOKEN"
  elif [ -n "${REACTICITY_ENGINEERING_TOKEN:-}" ]; then
    auth_header="PRIVATE-TOKEN: $REACTICITY_ENGINEERING_TOKEN"
  else
    echo "Cannot retrieve ${source_project}@${source_ref}: no read-only GitLab credential is configured." >&2
    echo "Set CI_JOB_TOKEN or REACTICITY_ENGINEERING_TOKEN." >&2
    exit 1
  fi

  if ! curl --fail --silent --show-error --location \
    --retry 3 --connect-timeout 15 --max-time 60 \
    --header "$auth_header" \
    --output "$temporary" \
    "$source_url"; then
    echo "Failed to retrieve the pinned React coding guidelines." >&2
    exit 1
  fi
fi

if [ ! -s "$temporary" ]; then
  echo "The retrieved React coding guidelines are empty." >&2
  exit 1
fi

if [ "$mode" = "--check" ]; then
  if [ ! -f "$destination" ] || ! cmp -s "$temporary" "$destination"; then
    echo "React coding guidelines are not synchronized with ${source_project}@${source_ref}." >&2
    echo "Run scripts/sync-react-coding-guidelines.sh --update and commit the result." >&2
    exit 1
  fi
  echo "React coding guidelines match ${source_project}@${source_ref} (version ${source_version})."
  exit 0
fi

chmod 0644 "$temporary"
mv -f "$temporary" "$destination"
trap - 0 1 2 3 15
echo "Updated docs/guidelines/react_coding_guidelines.md from ${source_project}@${source_ref} (version ${source_version})."
