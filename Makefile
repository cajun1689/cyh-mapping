# ============================================================
# CYH Mapping — Makefile
# ============================================================
# Usage:
#   make infra           Provision all AWS resources
#   make deploy           Build and deploy frontend + backend
#   make deploy-frontend  Build frontend and sync to S3
#   make deploy-backend   Push backend code to EC2 and restart
#   make destroy          Tear down all AWS resources
#   make ssh              SSH into the backend EC2 instance
#   make logs             Tail PM2 logs on the EC2 instance
#   make status           Show Terraform outputs (IPs, URLs)
# ============================================================

.PHONY: infra deploy deploy-frontend deploy-backend destroy ssh logs status

# Read Terraform outputs without re-running plan
TF_DIR := infra
TF_OUTPUT = cd $(TF_DIR) && terraform output -raw

# -------------------------------------------------------------------
# Infrastructure
# -------------------------------------------------------------------

infra:
	cd $(TF_DIR) && terraform init && terraform apply

destroy:
	cd $(TF_DIR) && terraform destroy

status:
	cd $(TF_DIR) && terraform output

# -------------------------------------------------------------------
# Frontend deployment
# -------------------------------------------------------------------

deploy-frontend:
	@echo "=== Building frontend ==="
	npm run build
	@echo "=== Syncing to S3 ==="
	aws s3 sync build/ s3://$$($(TF_OUTPUT) frontend_bucket) --delete
	@echo "=== Invalidating CloudFront cache ==="
	aws cloudfront create-invalidation \
		--distribution-id $$($(TF_OUTPUT) cloudfront_id) \
		--paths "/*"
	@echo "=== Frontend deployed ==="

# -------------------------------------------------------------------
# Backend deployment
# -------------------------------------------------------------------

deploy-backend:
	@echo "=== Deploying backend to EC2 ==="
	rsync -avz \
		--exclude node_modules \
		--exclude .env \
		--exclude .git \
		backend/ ec2-user@$$($(TF_OUTPUT) ec2_ip):~/app/
	ssh ec2-user@$$($(TF_OUTPUT) ec2_ip) \
		"cd ~/app && npm install --production && pm2 restart cyh-mapping-backend || pm2 start server.js --name cyh-mapping-backend"
	@echo "=== Backend deployed ==="

# -------------------------------------------------------------------
# Full deployment
# -------------------------------------------------------------------

deploy: deploy-frontend deploy-backend
	@echo "=== Full deployment complete ==="
	@echo "Site URL: $$($(TF_OUTPUT) site_url)"
	@echo "Backend:  $$($(TF_OUTPUT) backend_url)"

# -------------------------------------------------------------------
# Convenience
# -------------------------------------------------------------------

ssh:
	ssh ec2-user@$$($(TF_OUTPUT) ec2_ip)

logs:
	ssh ec2-user@$$($(TF_OUTPUT) ec2_ip) "pm2 logs"
