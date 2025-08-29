#!/bin/sh
# scripts/docker-entrypoint.sh

# Wait for MongoDB to be ready
# Simple loop, in a real-world scenario you might want a more robust check
until nc -z mongodb 27017; do
  echo "Waiting for MongoDB..."
  sleep 1
done

echo "MongoDB is up - executing command"

# Execute the command passed to this script
exec "$@"
