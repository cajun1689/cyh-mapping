# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `CHANGELOG.md` to track all project changes
- `ROADMAP.md` as a working plan for modernization and AWS deployment
- `.env.example` with environment variable documentation
- `backend/` — cloned [healthy-transitions-backend](https://github.com/mapping-action-collective/healthy-transitions-backend) into project
- Backend analysis integrated into `ROADMAP.md` (Phase 5 expanded with dependency upgrades, DB setup, deployment steps, env vars)
- `infra/` — Terraform infrastructure-as-code for full AWS provisioning
  - `main.tf` — provider config, AMI lookup
  - `variables.tf` — all configurable inputs with descriptions
  - `network.tf` — security group (SSH, HTTP, HTTPS)
  - `ec2.tf` — backend server (t4g.micro) with Elastic IP
  - `s3.tf` — S3 bucket for static frontend hosting with CloudFront OAC
  - `cloudfront.tf` — CDN with S3 + EC2 backend origins, SPA routing, HTTPS
  - `dns.tf` — optional Route 53 + ACM certificate (conditional on domain_name)
  - `outputs.tf` — EC2 IP, CloudFront URL, S3 bucket name, SSH command
  - `terraform.tfvars.example` — documented example configuration
- `infra/scripts/user-data.sh` — EC2 bootstrap script (Node 20, PostgreSQL 15, nginx, PM2, daily backups)
- `infra/scripts/setup-db.sh` — standalone database initialization script (tables + admin user seed)
- `Makefile` — top-level commands: `make infra`, `make deploy`, `make destroy`, `make ssh`, `make logs`, `make status`

### Changed
- `ROADMAP.md` — revised AWS architecture from Lambda/DynamoDB to EC2/PostgreSQL after analyzing the backend complexity (admin panel, CSV workflow, auth)
- `ROADMAP.md` — updated cost estimates to reflect full-stack deployment (~$1.50/mo with free tier, ~$20/mo after)
- `.gitignore` — added Terraform state files, .terraform/ directory, terraform.tfvars

### Removed
- (none yet)

### Fixed
- (none yet)

---

## [1.0.1] - 2022-01-01 (Inherited from upstream)

_Last tagged release from mapping-action-collective/healthy-transitions-frontend._

### Summary of inherited codebase
- React 17 single-page application using Create React App
- Leaflet-based interactive map with marker clustering
- Semantic UI React component library
- React Router v6 beta for routing
- Backend API integration (Heroku-hosted, now defunct)
- Google Forms / Airtable embedded forms for user feedback
- Session storage for saved listings
- Google Analytics integration (commented out)

[Unreleased]: https://github.com/mapping-action-collective/healthy-transitions-frontend/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/mapping-action-collective/healthy-transitions-frontend/releases/tag/v1.0.1
