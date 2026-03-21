/**
 * Canonical values for structured filter fields.
 * Used to extract from keywords and for filtering.
 */

/** Service delivery / format: In-Person, Online, Telehealth */
const SERVICE_DELIVERY = ['In-Person', 'Online', 'Telehealth']

/** Keywords that map to service delivery (from legacy keywords) */
const SERVICE_DELIVERY_KEYWORDS = {
  'In-Person': ['In-Person', 'In Person'],
  'Online': ['Online Only', 'Online'],
  'Telehealth': ['Telehealth', 'Telehealth Only'],
}

/** Insurance types for filtering (future) */
const INSURANCE_KEYWORDS = [
  'Medicaid',
  'Medicare',
  'Private Insurance',
  'OHP',
  'TriCare',
  'BCBS',
  'Cigna',
  'Accepts Uninsured',
  'Insurance', // generic - may need refinement
]

module.exports = {
  SERVICE_DELIVERY,
  SERVICE_DELIVERY_KEYWORDS,
  INSURANCE_KEYWORDS,
}
