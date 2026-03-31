#!/bin/bash

RANDOM_NB=$((1024 + RANDOM % 48000))
echo "Use random base port $RANDOM_NB"

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null | sed 's/[^a-zA-Z0-9-]/-/g')
DEV_HOST="${BRANCH:-events}.localhost"

cat <<EOF > ".env"
DEV_HOST=${DEV_HOST}

NGINX_PORT=$((RANDOM_NB))

DEV_API_PORT=$((RANDOM_NB + 1))
DEV_UI_PORT=$((RANDOM_NB + 2))
DEV_UI_HMR_PORT=$((RANDOM_NB + 3))

MONGO_PORT=$((RANDOM_NB + 10))

SD_PORT=$((RANDOM_NB + 20))
EOF
