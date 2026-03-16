# Sponsor logos (bundled with deploy)

These logos are deployed with every frontend build and **cannot be deleted** by `make deploy-frontend`.

**Default sponsors (always in S3):**
- `casper-youth-hub.svg` — Casper Youth Hub
- `unicorn-solutions.svg` — Unicorn Solutions

**To replace with custom logos:** Overwrite these files with your PNG/SVG (same filenames) and redeploy. Do not remove them.

**Admin-uploaded sponsors** go to `sponsor-logos/uploads/` in S3 and are preserved across deploys.
