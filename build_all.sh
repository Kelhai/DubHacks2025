#!/usr/bin/env bash
set -e

BUILD_FRONTEND=false
if [ "$1" == "--all" ]; then
  BUILD_FRONTEND=true
fi

OUT_DIR="build"
mkdir -p "$OUT_DIR"

# Build backend Lambdas
for dir in backend/cmd/*; do
  if [ -d "$dir" ]; then
    name=$(basename "$dir")
    echo "Building Lambda: $name"

    cd backend
    GOOS=linux GOARCH=amd64 go build -o "../$OUT_DIR/bootstrap" "./cmd/$name"
    cd ..

    (cd "$OUT_DIR" && zip -j "${name}.zip" bootstrap)
    rm "$OUT_DIR/bootstrap"
  fi
done

# Optional frontend build & deploy
if [ "$BUILD_FRONTEND" = true ]; then
  echo "Building frontend..."
  cd frontend

  # Install dependencies if missing
  npm install

  # Build into dist/
  npm run build

  # Upload to S3 (CloudFront will serve from the bucket)
  aws s3 sync dist/ s3://tau-frontend/ --delete

  cd ..
fi
echo "✅ Build complete"

