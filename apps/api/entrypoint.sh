#!/bin/sh
set -e

# The Fly volume mounts at /data owned by root regardless of what user the
# container normally runs as, so this step still needs root — chown it to
# the app user, then drop privileges via gosu for the actual node process.
# (Without this, an unprivileged process could never write db.sqlite there.)
chown -R nestjs:nodejs /data

exec gosu nestjs node main.js
