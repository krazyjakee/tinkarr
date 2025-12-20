#!/bin/sh
set -e

# Default PUID and PGID to 1000 if not set
PUID=${PUID:-1000}
PGID=${PGID:-1000}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Tinkarr Docker Entrypoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Requested PUID: $PUID"
echo "  Requested PGID: $PGID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if tinkarr user exists and get current IDs
if id tinkarr >/dev/null 2>&1; then
    CURRENT_UID=$(id -u tinkarr)
    CURRENT_GID=$(id -g tinkarr)
    echo "Current tinkarr user: UID=$CURRENT_UID, GID=$CURRENT_GID"
else
    echo "tinkarr user does not exist yet"
    CURRENT_UID=""
    CURRENT_GID=""
fi

# Only modify if needed
if [ "$PUID" != "$CURRENT_UID" ] || [ "$PGID" != "$CURRENT_GID" ]; then
    echo "Modifying user to match PUID=$PUID, PGID=$PGID..."

    # Remove existing tinkarr user if it exists
    if id tinkarr >/dev/null 2>&1; then
        echo "  Removing existing tinkarr user..."
        deluser tinkarr 2>/dev/null || true
    fi

    # Remove existing tinkarr group if it exists
    if getent group tinkarr >/dev/null 2>&1; then
        echo "  Removing existing tinkarr group..."
        delgroup tinkarr 2>/dev/null || true
    fi

    # Handle conflicts with target GID
    if getent group "$PGID" >/dev/null 2>&1; then
        EXISTING_GROUP=$(getent group "$PGID" | cut -d: -f1)
        echo "  Warning: GID $PGID already used by '$EXISTING_GROUP', removing it..."
        delgroup "$EXISTING_GROUP" 2>/dev/null || true
    fi

    # Handle conflicts with target UID
    if getent passwd "$PUID" >/dev/null 2>&1; then
        EXISTING_USER=$(getent passwd "$PUID" | cut -d: -f1)
        echo "  Warning: UID $PUID already used by '$EXISTING_USER', removing it..."
        deluser "$EXISTING_USER" 2>/dev/null || true
    fi

    # Create new group with desired GID
    echo "  Creating group tinkarr with GID=$PGID..."
    if ! addgroup -g "$PGID" tinkarr; then
        echo "  ERROR: Failed to create group with GID=$PGID"
        exit 1
    fi

    # Create new user with desired UID
    echo "  Creating user tinkarr with UID=$PUID..."
    if ! adduser -u "$PUID" -G tinkarr -D -H -s /sbin/nologin tinkarr; then
        echo "  ERROR: Failed to create user with UID=$PUID"
        exit 1
    fi

    echo "  ✓ User modification completed"
else
    echo "User already has correct UID/GID, no changes needed"
fi

# Verify final configuration
FINAL_UID=$(id -u tinkarr)
FINAL_GID=$(id -g tinkarr)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Final Configuration:"
echo "  tinkarr user: UID=$FINAL_UID, GID=$FINAL_GID"

# Fail if verification doesn't match
if [ "$FINAL_UID" != "$PUID" ] || [ "$FINAL_GID" != "$PGID" ]; then
    echo "  ✗ ERROR: User modification failed!"
    echo "    Expected: UID=$PUID, GID=$PGID"
    echo "    Got:      UID=$FINAL_UID, GID=$FINAL_GID"
    exit 1
fi

echo "  ✓ Configuration verified successfully"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Ensure /app/data exists and has correct permissions
echo "Setting up data directory permissions..."
mkdir -p /app/data
chown -R tinkarr:tinkarr /app/data
chmod -R 755 /app/data
echo "Permissions configured"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Starting Tinkarr..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Run migrations, seed (if needed), and start server as tinkarr user
exec su-exec tinkarr sh -c "node dist/db/migrate.js && node dist/db/seed.js && exec node dist/server.js"
