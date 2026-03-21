import React, { useState } from 'react'
import { Form, Button, Message } from 'semantic-ui-react'
import './SuggestUpdate.css'

const CATEGORY_DELIMITER = ' || '

function SubmitResourceForm({ apiUrl, metadata }) {
  const [formData, setFormData] = useState({
    full_name: '',
    category: [],
    custom_categories: '',
    description: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    phone_1: '',
    crisis_line_number: '',
    website: '',
    program_email: '',
    parent_organization: '',
    full_address: '',
    city: 'Casper',
    service_type: 'In-Person',
    age_group: 'Youth and Adult',
    faith_based: false,
    min_age: 11,
    max_age: 20,
    eligibility_requirements: '',
    financial_information: '',
    intake_instructions: '',
    languages_offered: '',
    internal_directions: '',
    submitter_email: '',
  })
  const [files, setFiles] = useState({ building_image: null, office_entrance_image: null })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const categories = metadata?.listingCategories
    ? Object.keys(metadata.listingCategories).sort()
    : []

  const update = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    if (!formData.full_name?.trim()) {
      setError('Resource name is required.')
      return
    }
    const selectedCats = Array.isArray(formData.category) ? formData.category : []
    const customCats = (formData.custom_categories || '').split(/[\n;]+/).map((s) => s.trim()).filter(Boolean)
    const allCats = [...new Set([...selectedCats, ...customCats])]
    if (allCats.length === 0) {
      setError('Please select at least one category.')
      return
    }
    if (!formData.description?.trim()) {
      setError('Description is required.')
      return
    }

    setLoading(true)
    try {
      const body = new FormData()
      Object.entries(formData).forEach(([k, v]) => {
        if (v === null || v === undefined) return
        if (k === 'category') body.append(k, Array.isArray(v) ? v.join(',') : v)
        else if (k === 'faith_based') body.append(k, v ? 'on' : '')
        else body.append(k, v)
      })
      if (files.building_image) body.append('building_image', files.building_image)
      if (files.office_entrance_image) body.append('office_entrance_image', files.office_entrance_image)

      const res = await fetch(`${apiUrl}/submit-resource`, {
        method: 'POST',
        body,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || data.detail || 'Failed to submit')
      setResult(data.message || 'Thank you! Your submission is pending review.')
      setFormData({
        full_name: '',
        category: [],
        custom_categories: '',
        description: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        phone_1: '',
        crisis_line_number: '',
        website: '',
        program_email: '',
        parent_organization: '',
        full_address: '',
        city: 'Casper',
        service_type: 'In-Person',
        age_group: 'Youth and Adult',
        faith_based: false,
        min_age: 11,
        max_age: 20,
        eligibility_requirements: '',
        financial_information: '',
        intake_instructions: '',
        languages_offered: '',
        internal_directions: '',
        submitter_email: '',
      })
      setFiles({ building_image: null, office_entrance_image: null })
    } catch (err) {
      setError(err.message || 'Failed to submit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="suggest-form">
      <p className="suggest-intro">
        For social service providers: submit your organization or resource to be considered for the map. Your submission will be reviewed before it appears.
      </p>
      <Form onSubmit={handleSubmit}>
        <Form.Input
          label="Resource / Organization Name"
          placeholder="e.g. Central Wyoming Counseling Center"
          value={formData.full_name}
          onChange={(e, { value }) => update('full_name', value)}
          required
        />

        <Form.Select
          className="categories-select"
          label="Categories"
          placeholder="Select categories"
          options={categories.map((c) => ({ key: c, value: c, text: c }))}
          value={formData.category}
          onChange={(e, { value }) => update('category', value)}
          multiple
          search
          required
        />
        <Form.TextArea
          label="Additional categories (optional)"
          placeholder="Use semicolons or new lines"
          value={formData.custom_categories}
          onChange={(e, { value }) => update('custom_categories', value)}
          rows={2}
        />

        <Form.TextArea
          label="Description"
          placeholder="Describe the program or services"
          value={formData.description}
          onChange={(e, { value }) => update('description', value)}
          rows={3}
          required
        />

        <Form.Group widths="equal">
          <Form.Input
            label="Phone"
            placeholder="307-xxx-xxxx"
            value={formData.phone_1}
            onChange={(e, { value }) => update('phone_1', value)}
          />
          <Form.Input
            label="Crisis Line"
            placeholder="If applicable"
            value={formData.crisis_line_number}
            onChange={(e, { value }) => update('crisis_line_number', value)}
          />
        </Form.Group>
        <Form.Group widths="equal">
          <Form.Input
            label="Website"
            type="url"
            placeholder="https://example.org"
            value={formData.website}
            onChange={(e, { value }) => update('website', value)}
          />
          <Form.Input
            label="Email"
            type="email"
            placeholder="contact@example.org"
            value={formData.program_email}
            onChange={(e, { value }) => update('program_email', value)}
          />
        </Form.Group>

        <Form.Input
          label="Full Address"
          placeholder="123 Main St, Casper, WY 82601"
          value={formData.full_address}
          onChange={(e, { value }) => update('full_address', value)}
        />
        <Form.Group widths="equal">
          <Form.Input
            label="City"
            value={formData.city}
            onChange={(e, { value }) => update('city', value)}
          />
          <Form.Select
            label="Service Type"
            options={[
              { key: 'inperson', value: 'In-Person', text: 'In-Person' },
              { key: 'online', value: 'Online Only', text: 'Online Only' },
              { key: 'both', value: 'In-Person,Telehealth', text: 'In-Person + Telehealth' },
              { key: 'telehealth', value: 'Telehealth', text: 'Telehealth Only' },
            ]}
            value={formData.service_type}
            onChange={(e, { value }) => update('service_type', value)}
          />
        </Form.Group>
        <Form.Group widths="equal">
          <Form.Select
            label="Age Group"
            options={[
              { key: 'both', value: 'Youth and Adult', text: 'Youth and Adult' },
              { key: 'youth', value: 'Youth', text: 'Youth Only' },
              { key: 'adult', value: 'Adult', text: 'Adult Only' },
            ]}
            value={formData.age_group}
            onChange={(e, { value }) => update('age_group', value)}
          />
          <Form.Checkbox
            label="Faith-Based Organization"
            checked={formData.faith_based}
            onChange={(e, { checked }) => update('faith_based', checked)}
          />
        </Form.Group>

        <Form.Group widths="equal">
          <Form.Input
            label="Min Age"
            type="number"
            min={0}
            max={99}
            value={formData.min_age}
            onChange={(e, { value }) => update('min_age', value)}
          />
          <Form.Input
            label="Max Age"
            type="number"
            min={0}
            max={99}
            value={formData.max_age}
            onChange={(e, { value }) => update('max_age', value)}
          />
        </Form.Group>
        <Form.Input
          label="Cost / Financial Info"
          placeholder="e.g. Free, Sliding scale"
          value={formData.financial_information}
          onChange={(e, { value }) => update('financial_information', value)}
        />
        <Form.Input
          label="Languages Offered"
          placeholder="e.g. English, Spanish"
          value={formData.languages_offered}
          onChange={(e, { value }) => update('languages_offered', value)}
        />

        <Form.TextArea
          label="Directions (multi-office buildings)"
          placeholder="e.g. Take elevator to 2nd floor..."
          value={formData.internal_directions}
          onChange={(e, { value }) => update('internal_directions', value)}
          rows={2}
        />

        <Form.Input
          label="Your email (for follow-up)"
          type="email"
          placeholder="your@email.org"
          value={formData.submitter_email}
          onChange={(e, { value }) => update('submitter_email', value)}
        />

        <Form.Input
          label="Building photo (optional)"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFiles((f) => ({ ...f, building_image: e.target.files?.[0] || null }))}
        />
        <Form.Input
          label="Office entrance photo (optional)"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFiles((f) => ({ ...f, office_entrance_image: e.target.files?.[0] || null }))}
        />

        {error && <Message negative>{error}</Message>}
        {result && <Message positive>{result}</Message>}

        <Button type="submit" primary loading={loading} disabled={loading} className="suggest-submit">
          Submit for Review
        </Button>
      </Form>
    </div>
  )
}

export default SubmitResourceForm
