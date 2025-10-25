#!/bin/bash

# Deploy to Yandex Cloud Kubernetes
# Usage: ./scripts/deploy-k8s.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
REGISTRY="cr.yandex/your-registry"
IMAGE_TAG=${2:-latest}

echo "🚀 Deploying to $ENVIRONMENT environment..."

# 1. Build Docker image
echo "📦 Building Docker image..."
docker build -t $REGISTRY/domeo:$IMAGE_TAG .

# 2. Push to registry
echo "⬆️ Pushing to registry..."
docker push $REGISTRY/domeo:$IMAGE_TAG

# 3. Update deployment
echo "🔄 Updating deployment..."
kubectl set image deployment/domeo-app domeo-app=$REGISTRY/domeo:$IMAGE_TAG -n $ENVIRONMENT

# 4. Wait for rollout
echo "⏳ Waiting for rollout..."
kubectl rollout status deployment/domeo-app -n $ENVIRONMENT

# 5. Health check
echo "🏥 Health check..."
kubectl get pods -n $ENVIRONMENT -l app=domeo-app

# 6. Run smoke tests
echo "🧪 Running smoke tests..."
kubectl run smoke-test --image=curlimages/curl --rm -i --restart=Never -- \
  curl -f http://domeo-app-service.$ENVIRONMENT.svc.cluster.local/api/health

echo "✅ Deployment completed successfully!"

