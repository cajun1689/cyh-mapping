# Data Enrichment Research: Wyoming Youth Resource Map

This document summarizes research on data sources and methods to enrich listing information for the CYH Mapping project.

---

## Current Data State (Live Map)

The map has **230 listings** (from `https://casperyouthhubmap.org/api/listings`):

| Field | Coverage | Notes |
|-------|----------|-------|
| guid, full_name, category, description | 100% | Required fields |
| phone_1 | 91% | 210 of 230 |
| website | 79% | 182 of 230 |
| full_address, city, lat/lng | ~85% | Online-only have no address |
| building_description | 30% | 69 of 230 |
| program_email | 0% | **All empty** – high priority |
| financial_information | 0% | **All empty** |
| eligibility_requirements | 0% | **All empty** |
| intake_instructions | 0% | **All empty** |
| languages_offered | 0% | **All empty** |
| crisis_line_number | 1% | 2 of 230 |
| Social links (facebook, instagram, etc.) | 0% | **All empty** |
| ADA_accessibility_notes, transit_instructions | 0% | **All empty** |

---

## Form-to-Scrape Mapping

The provider submission form (`docs/google-form-questions.md`) asks for these fields. The enrichment script scrapes organization websites to fill the same fields:

| Form question | DB field | Scrape strategy |
|---------------|----------|-----------------|
| Organization email | `program_email` | mailto links, email regex |
| Organization phone | `phone_1` | phone regex |
| Website URL | `website` | (usually already present) |
| Crisis line | `crisis_line_number` | phone near "crisis" |
| Cost / financial info | `financial_information` | Medicaid, sliding scale, free, insurance |
| Eligibility | `eligibility_requirements` | eligibility section |
| Intake instructions | `intake_instructions` | "call to schedule", "walk-in" |
| Languages offered | `languages_offered` | languages section, Spanish |
| Facebook, Instagram, etc. | `facebook_link`, etc. | href with social domain |
| Building description | `building_description` | location/contact section |
| ADA accessibility | `ADA_accessibility_notes` | wheelchair, accessible |
| Transit instructions | `transit_instructions` | bus, parking, transit |
| Description | `description` | meta description, og:description, or first meaningful paragraph; cleaned and trimmed (40–450 chars). Updated when current is empty, very short, or we find a substantially better one. |

---

## Data Sources Researched

### 1. Wyoming 211 (Primary Opportunity)

**URL:** https://wyoming211.org/ | **Search:** https://search.wyoming211.org/

- **2,900+ resources** in their database
- Most comprehensive community resource database in Wyoming
- Covers: mental health, substance use, crisis, housing, food, legal, health, etc.
- **Contact for data partnership:** 1-307-433-3077 or specialist3@wyoming211.org
- **211 Counts Dashboard:** wy.211counts.org (analytics, not raw data)
- **Data format:** Uses AIRS/OpenReferral standards; may export via RTM or WellSky if they use those systems

**Recommendation:** Reach out to Wyoming 211 to request:
- Data export or API access for youth-focused resources
- Partnership for data sharing (they may add CYH Map as a referral partner)
- AIRS XML or HSDS JSON export if available

---

### 2. Wyoming Department of Health

**Mental Health Locations by County:** https://health.wyo.gov/behavioralhealth/mhsa/treatment/cmhc/

- Lists community mental health centers by county
- Includes: Volunteers of America, Cloud Peak Counseling, High Country Behavioral Health, etc.
- **Pediatric Mental Health Care Access:** https://health.wyo.gov/publichealth/mch/youthandyoungadult-health/pmhca/
- State-run programs; data may be available via public records or partnership

---

### 3. Wyoming Telehealth Network

**Provider Directory:** https://wyomingtelehealth.org/provider-directory/

- Mental health counselors and psychiatrists
- Contact info and specialties
- May have export or partnership options

---

### 4. Hughes Charitable Foundation – Wyoming Mental Health Resource List

**URL:** https://hughescf.org/wyoming-mental-health-resource-list/

- Curated list of Wyoming mental health resources
- Good for cross-referencing and finding new organizations

---

### 5. Kids Mental Health Foundation – Wyoming

**URL:** https://kidsmentalhealthfoundation.org/mental-health-resources/national-state-resources/wyoming

- State-level resource list
- Crisis resources (988, Crisis Text Line)

---

### 6. Google Places API (Technical)

- **Place Search** + **Place Details** can return: phone, website, hours, rating
- Requires `GOOGLE_API_KEY` with Places API enabled (separate from Geocoding)
- Cost: ~$17 per 1,000 Place Details requests
- Good for: filling phone, website, hours when we have name + address

---

### 7. Website Scraping (Technical)

- Many listings have `website` URLs
- Can fetch HTML and extract: phone (regex), email (regex), sometimes hours
- Free but fragile (sites change structure)
- Must respect robots.txt and rate limits

---

## Recommended Enrichment Strategy

### Phase 1: Quick Wins (Automated)

1. **Website extraction script** – For listings with URLs, fetch and extract:
   - Phone numbers (regex: `\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}`)
   - Emails (regex: `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`)
   - Output enriched CSV for admin review

2. **Google Places API** (if enabled) – For name + address, fetch:
   - `formatted_phone_number`, `website`, `opening_hours`
   - Fill gaps where website extraction fails

### Phase 2: Partnership (Manual + Data Share)

3. **Wyoming 211 partnership** – Contact for:
   - Bulk data export of youth-relevant resources
   - Ongoing sync or manual updates
   - Cross-reference our 57 listings with their 2,900+ for new orgs

4. **State/county directories** – Manually add:
   - Hours, eligibility, intake from Wyoming DOH and county sites
   - Crisis line numbers for crisis services

### Phase 3: Ongoing

5. **Provider outreach** – Ask providers to verify/update their listing via:
   - Google Form (already in siteConfig)
   - Admin panel access for verified orgs

---

## Enrichment Script

`backend/scripts/enrich-from-web.js` – Fetches **all 230 listings** from the live API, scrapes each organization's website for form-mapped fields, adds Street View images where available, and outputs an enriched CSV.

**Run:**
```bash
cd backend && npm run enrich
```

**Options (env vars or CLI):**
- `API_URL` / `--api-url` – API base (default: https://casperyouthhubmap.org/api)
- `LIMIT` / `--limit N` – Process only first N listings (for testing)
- `DELAY_MS` / `--delay N` – Delay between requests in ms (default: 1500)
- `GOOGLE_API_KEY` – Required for Street View. Set in `.env` (same key as Geocoding).

**Examples:**
```bash
# Full run (all 230, ~6 min)
npm run enrich

# Test with 10 listings
LIMIT=10 npm run enrich

# Faster (1s delay)
DELAY_MS=1000 npm run enrich
```

**Street View:** When `GOOGLE_API_KEY` is set, the script checks Google Street View metadata for each listing with an address or lat/lng. If imagery exists and the listing has no building photo, it adds a Street View URL to `image_url`. The frontend displays these with "© Google Maps" attribution. Restrict your API key to `casperyouthhubmap.org` in Google Cloud Console.

**Output:** `cyh-resources-enriched.csv` – Review before uploading via admin panel (Listings > Upload). The CSV contains all listings; only empty fields are filled from scraped data.

---

## Next Steps

1. Run full enrichment: `cd backend && npm run enrich`
2. Review `cyh-resources-enriched.csv` – spot-check scraped values (some may be placeholders)
3. Upload via admin panel (Listings > Upload) after review
4. Contact Wyoming 211 (specialist3@wyoming211.org) for data partnership
5. Add missing orgs from Hughes Foundation and Kids Mental Health Foundation lists
