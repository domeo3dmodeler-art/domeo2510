#!/bin/sh
set -e

# Create necessary directories with correct permissions
mkdir -p /app/public/uploads/products
mkdir -p /app/uploads
mkdir -p /app/logs

# Fix ownership of all directories
chown -R nextjs:nodejs /app/public/uploads
chown -R nextjs:nodejs /app/uploads
chown -R nextjs:nodejs /app/logs

# Switch to nextjs user and run the application
exec su -s /bin/sh nextjs -c "cd /app && node server.js"

