# Deployment Checklist

Use this checklist before and after every deploy to ensure nothing breaks.

## Before Deploy

- [ ] **Sponsor logos** — Default logos (Casper Youth Hub, Unicorn Solutions) live in `public/sponsor-logos/` and deploy with the build. Do NOT remove these files. To replace, overwrite with same filenames.
- [ ] **Makefile excludes** — `make deploy-frontend` must exclude `sponsor-logos/uploads/*` and `listing-images/*` so admin-uploaded content is never deleted. Verify in `Makefile`:
  ```makefile
  aws s3 sync build/ ... --delete \
    --exclude "sponsor-logos/uploads/*" --exclude "listing-images/*"
  ```

## After Deploy

- [ ] **Sponsor logos visible** — Visit the live site and confirm "Made Possible By" shows logos (not just text). If you see names only, run `make seed-sponsors` on EC2.
- [ ] **Listings load** — Admin panel → Manage Listings shows resources.
- [ ] **Users load** — Admin panel → Users shows admin accounts.

## Seed Default Sponsors

If sponsor logos show as text instead of images:

```bash
make seed-sponsors
```

Or manually on EC2:

```bash
ssh -i ~/.ssh/cyh-key.pem ec2-user@$(cd infra && terraform output -raw ec2_ip) "cd ~/app && node scripts/seed-sponsors.js"
```

This upserts Casper Youth Hub and Unicorn Solutions with paths to the bundled logos in `public/sponsor-logos/`.

## Architecture

| Path | Source | Preserved on deploy? |
|------|--------|----------------------|
| `/sponsor-logos/casper-youth-hub.svg` | `public/sponsor-logos/` (in repo) | Yes — deployed with build |
| `/sponsor-logos/unicorn-solutions.svg` | `public/sponsor-logos/` (in repo) | Yes — deployed with build |
| `/sponsor-logos/uploads/*` | Admin panel uploads | Yes — excluded from sync |
| `/listing-images/*` | Admin panel uploads | Yes — excluded from sync |
