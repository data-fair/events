#!/bin/bash

RANDOM_NB=$((1024 + RANDOM % 48000))
echo "Use random base port $RANDOM_NB"

cat <<EOF > ".env"
NGINX_PORT=$((RANDOM_NB))

DEV_API_PORT=$((RANDOM_NB + 1))
DEV_UI_PORT=$((RANDOM_NB + 2))

MONGO_PORT=$((RANDOM_NB + 10))

SD_PORT=$((RANDOM_NB + 20))
EOF
