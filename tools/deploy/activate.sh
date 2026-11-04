#!/usr/bin/env bash
set -euo pipefail
release="$1"
archive="$2"
root="$3"
[[ "$release" =~ ^[0-9TZ]+-[a-f0-9]{12}$ ]] || { echo 'Invalid release id' >&2; exit 1; }
[[ "$root" == /var/www/studynote ]] || { echo 'Unexpected site root' >&2; exit 1; }
target="$root/releases/$release"
nginx -t
test ! -e "$target"
install -d -m 755 "$root/releases" "$target"
tar --no-same-owner --no-same-permissions -xzf "$archive" -C "$target"
test -s "$target/index.html"
test -s "$target/404.html"
test -s "$target/__release.json"
find "$target" -type d -exec chmod 755 {} +
find "$target" -type f -exec chmod 644 {} +
nginx -t
previous="$(readlink "$root/current" || true)"
ln -s "$target" "$root/.current-$release"
mv -Tf "$root/.current-$release" "$root/current"
if ! nginx -t || ! systemctl reload nginx; then
    if [ -n "$previous" ]; then
        ln -s "$previous" "$root/.rollback-$release"
        mv -Tf "$root/.rollback-$release" "$root/current"
        systemctl reload nginx
    fi
    echo 'Activation failed; previous release restored when available' >&2
    exit 1
fi
printf 'Activated %s\n' "$target"
sha256sum "$target/index.html" "$target/__release.json"
