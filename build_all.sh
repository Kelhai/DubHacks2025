#!/usr/bin/env bash
set -e

BUILD_FRONTEND=false
if [ "$1" == "--all" ]; then
  BUILD_FRONTEND=true
fi

OUT_DIR="build"
mkdir -p "$OUT_DIR"

# -------------------
# Build backend Lambdas
# -------------------
for dir in backend/cmd/*; do
  if [ -d "$dir" ]; then
    name=$(basename "$dir")
    echo "Building Lambda: $name"

    cd backend
    GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o "../$OUT_DIR/bootstrap" "./cmd/$name"

    cd ..

    (cd "$OUT_DIR" && zip -j "${name}.zip" bootstrap)
    rm "$OUT_DIR/bootstrap"
  fi
done

# -------------------
# Optional frontend build
# -------------------
if [ "$BUILD_FRONTEND" = true ]; then
  echo "Building frontend..."

  # Get the API Gateway URL from Terraform
  API_URL=$(terraform -chdir=infra output -raw api_url)
  echo "Using API URL: $API_URL"

  cd frontend

  # Create a .env file for Vite
  echo "VITE_API_BASE=$API_URL" > .env.local
  
  rm -rf dist/

  npm ci
  npm run build

  # Upload to S3
  aws s3 sync dist/ s3://tau-frontend/

  cd ..
fi

echo "✅ Build complete"

