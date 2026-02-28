#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "Building frontend..."
NODE_OPTIONS=--openssl-legacy-provider npx react-scripts build

echo "Deploying to S3 (preserving uploaded content)..."
aws s3 sync build/ s3://cyh-mapping-frontend/ \
  --delete \
  --exclude "sponsor-logos/*" \
  --exclude "listing-images/*" \
  --region us-west-2

echo "Invalidating CloudFront cache..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id E3UO9EPNPWZ2B8 \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

echo "Done! Invalidation ID: $INVALIDATION_ID"
