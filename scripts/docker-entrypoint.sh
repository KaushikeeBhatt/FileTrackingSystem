#!/bin/sh
# scripts/docker-entrypoint.sh

# Wait for MongoDB to be ready
until nc -z mongodb 27017; do
  echo "Waiting for MongoDB..."
  sleep 1
done

echo "MongoDB is up - running setup script"

# Run the setup script to create the admin user if it doesn't exist
pnpm run setup:admin

echo "Setup script finished - executing command"

# Execute the command passed to this script
exec "$@"
