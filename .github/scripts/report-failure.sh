#!/usr/bin/env bash
# Turns the last lines of a failed test log into a GitHub annotation, so the
# failure reason shows on the run's summary page (and through the checks
# API) without having to open and scroll the raw job log.
# Usage: report-failure.sh <log file> <title>
log="$1"; title="$2"
[ -f "$log" ] || exit 0
# Annotations are single-line; GitHub decodes %0A back into newlines.
body=$(tail -n 120 "$log" | sed -e 's/\x1b\[[0-9;]*m//g' -e 's/%/%25/g' -e 's/\r//g' | awk '{printf "%s%%0A", $0}')
echo "::error title=${title}::${body}"
