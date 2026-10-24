#!/usr/bin/env bash
# Back up the live build on the server and check the copy (deploy checklist, step 6,
# docs/guides/deployment.md). Run it from the deploy lane; it runs on the server:
#
#   ssh siggi@kvenno.app 'bash -s' < scripts/backup-live-build.sh
#
# It writes only into ~/backups on the server. The backup's name holds the date and the
# version of the live build it copies. Only "the backup matches the live build" passes.
set -euo pipefail

live=${LIVE_BUILD:-/var/www/namsbokasafn-vefur/build}
backups=${BACKUP_DIR:-$HOME/backups}

mkdir -p "$backups"
version=$(grep -oE '[0-9]+' "$live/_app/version.json")
bak="$backups/namsbokasafn-build-$(date +%F)-v$version"

if [ -e "$bak" ]; then
	echo "$bak is there already: checking it"
else
	cp -a "$live" "$bak"
fi

echo "files: live $(find "$live" -type f | wc -l), backup $(find "$bak" -type f | wc -l)"
sums() { (cd "$1" && find . -type f -print0 | LC_ALL=C sort -z | xargs -0 sha256sum); }
if diff -q <(sums "$live") <(sums "$bak") >/dev/null; then
	echo "the backup matches the live build: $bak"
else
	echo "STOP: the backup differs from the live build"
	exit 1
fi
