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

.PHONY: infra deploy deploy-frontend deploy-backend destroy ssh logs status upload-csv migrate-structured-filters

# Read Terraform outputs without re-running plan
TF_DIR := infra
TF_OUTPUT = cd $(TF_DIR) && terraform output -raw

# SSH key for EC2 access (AWS key pair: cyh-key)
SSH_KEY := ~/.ssh/cyh-key.pem
SSH_OPTS := -i $(SSH_KEY)

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
	CI=false NODE_OPTIONS=--openssl-legacy-provider npm run build
	@echo "=== Syncing to S3 ==="
	aws s3 sync build/ s3://$$($(TF_OUTPUT) frontend_bucket) --delete \
		--exclude "sponsor-logos/uploads/*" --exclude "listing-images/*"
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
	rsync -avz -e "ssh $(SSH_OPTS)" \
		--exclude node_modules \
		--exclude .env \
		--exclude .git \
		backend/ ec2-user@$$($(TF_OUTPUT) ec2_ip):~/app/
	ssh $(SSH_OPTS) ec2-user@$$($(TF_OUTPUT) ec2_ip) \
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
	ssh $(SSH_OPTS) ec2-user@$$($(TF_OUTPUT) ec2_ip)

logs:
	ssh $(SSH_OPTS) ec2-user@$$($(TF_OUTPUT) ec2_ip) "pm2 logs"

# -------------------------------------------------------------------
# Upload enriched CSV directly to production (bypasses web admin)
# Run deploy-backend first if you've added or changed scripts/upload-csv.js
# -------------------------------------------------------------------

UPLOAD_CSV ?= cyh-resources-enriched.csv

upload-csv:
	@echo "=== Uploading $(UPLOAD_CSV) to production ==="
	scp $(SSH_OPTS) "$(UPLOAD_CSV)" ec2-user@$$($(TF_OUTPUT) ec2_ip):~/
	ssh $(SSH_OPTS) ec2-user@$$($(TF_OUTPUT) ec2_ip) \
		"cd ~/app && node scripts/upload-csv.js ~/$(UPLOAD_CSV)"
	@echo "=== Done. Listings live at https://casperyouthhubmap.org ==="

# Update description for a listing. Usage: make update-desc GUID=137 DESC="New description"
update-desc:
	@echo "=== Updating description for guid $(GUID) ==="
	scp $(SSH_OPTS) backend/scripts/update-listing-description.js ec2-user@$$($(TF_OUTPUT) ec2_ip):~/app/scripts/
	ssh $(SSH_OPTS) ec2-user@$$($(TF_OUTPUT) ec2_ip) "cd ~/app && node scripts/update-listing-description.js $(GUID) '$(DESC)'"

# Seed default sponsors (Casper Youth Hub, Unicorn Solutions) with bundled logos.
# Run if sponsor logos show as text instead of images.
seed-sponsors:
	@echo "=== Seeding default sponsors ==="
	scp $(SSH_OPTS) backend/scripts/seed-sponsors.js ec2-user@$$($(TF_OUTPUT) ec2_ip):~/app/scripts/
	ssh $(SSH_OPTS) ec2-user@$$($(TF_OUTPUT) ec2_ip) "cd ~/app && node scripts/seed-sponsors.js"

# Clear images for specific listings (bad/placeholder photos). Usage: make clear-images GUIDS="59 137"
clear-images:
	@echo "=== Clearing images for listings $(GUIDS) ==="
	scp $(SSH_OPTS) backend/scripts/clear-listing-images.js ec2-user@$$($(TF_OUTPUT) ec2_ip):~/app/scripts/
	ssh $(SSH_OPTS) ec2-user@$$($(TF_OUTPUT) ec2_ip) "cd ~/app && node scripts/clear-listing-images.js $(GUIDS)"

# Add pending_submissions and feedback_responses tables on EC2.
# Run after: make deploy-backend (or if tables don't exist on production)
migrate-pending-feedback:
	@echo "=== Running pending & feedback migration on EC2 ==="
	scp $(SSH_OPTS) backend/scripts/migrate-pending-and-feedback.js ec2-user@$$($(TF_OUTPUT) ec2_ip):~/app/scripts/
	ssh $(SSH_OPTS) ec2-user@$$($(TF_OUTPUT) ec2_ip) "cd ~/app && node scripts/migrate-pending-and-feedback.js"
	@echo "=== Migration complete ==="

# Run migration to add service_delivery, insurance_keywords, parental_consent_required columns.
# Run after: make deploy-backend
migrate-structured-filters:
	@echo "=== Running structured filters migration ==="
	scp $(SSH_OPTS) backend/scripts/migrate-structured-filters.js ec2-user@$$($(TF_OUTPUT) ec2_ip):~/app/scripts/
	ssh $(SSH_OPTS) ec2-user@$$($(TF_OUTPUT) ec2_ip) "cd ~/app && node scripts/migrate-structured-filters.js"
	@echo "=== Migration complete ==="

# Create admin accounts for seth@casperyouthhub.org and elliottunicornsolutions@gmail.com.
# Usage: make add-admin-users ADD_ADMIN_PASSWORD="YourTempPassword"
add-admin-users:
	@echo "=== Adding admin users ==="
	scp $(SSH_OPTS) backend/scripts/add-admin-users.js ec2-user@$$($(TF_OUTPUT) ec2_ip):~/app/scripts/
	ssh $(SSH_OPTS) ec2-user@$$($(TF_OUTPUT) ec2_ip) "cd ~/app && node scripts/add-admin-users.js '$(ADD_ADMIN_PASSWORD)'"

# Export org spreadsheet (name, website, phone, description, tags, status, needs)
export-spreadsheet:
	@echo "=== Exporting org spreadsheet ==="
	node backend/scripts/export-org-spreadsheet.js
	@echo "Wrote org-data-spreadsheet.csv"

# Resend welcome emails to all org users (tests SES delivery)
resend-welcome-emails:
	scp $(SSH_OPTS) backend/scripts/resend-welcome-emails.js ec2-user@$$($(TF_OUTPUT) ec2_ip):~/app/scripts/
	ssh $(SSH_OPTS) ec2-user@$$($(TF_OUTPUT) ec2_ip) "cd ~/app && node scripts/resend-welcome-emails.js"

# Update Living Well Counseling: services, remove free, add searchable terms for chat
update-living-well:
	@echo "=== Updating Living Well Counseling (guid 31) ==="
	scp $(SSH_OPTS) backend/scripts/update-living-well.js ec2-user@$$($(TF_OUTPUT) ec2_ip):~/app/scripts/
	ssh $(SSH_OPTS) ec2-user@$$($(TF_OUTPUT) ec2_ip) "cd ~/app && node scripts/update-living-well.js"
