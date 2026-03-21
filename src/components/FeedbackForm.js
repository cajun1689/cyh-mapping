import React, { useState } from 'react'
import { Form, Button, Segment, Message } from 'semantic-ui-react'
import './SuggestUpdate.css'

const INTENT_OPTIONS = [
  { key: 'feedback', value: 'feedback', text: 'Give feedback about a listing', description: 'Comment on or suggest changes to an existing resource' },
  { key: 'recommend', value: 'recommend', text: 'Recommend a new resource', description: 'Suggest a resource that should be added to the map' },
  { key: 'bug', value: 'bug', text: 'Report something broken', description: 'Report a bug or technical issue with the site' },
]

function FeedbackForm({ apiUrl, onSuccess, initialListingRef }) {
  const [intent, setIntent] = useState(initialListingRef ? 'feedback' : '')
  const [listingRef, setListingRef] = useState(initialListingRef || '')
  const [message, setMessage] = useState('')
  const [bugDetails, setBugDetails] = useState('')
  const [resourceNameUrl, setResourceNameUrl] = useState('')
  const [resourceAdditional, setResourceAdditional] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const showListingRef = intent === 'feedback'
  const showMessage = intent === 'feedback' || intent === 'bug'
  const showBugDetails = intent === 'bug'
  const showResourceFields = intent === 'recommend'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    if (!intent) {
      setError('Please select what you would like to do.')
      return
    }
    if (intent === 'feedback' && !message && !listingRef) {
      setError('Please provide feedback and/or the name or URL of the listing.')
      return
    }
    if (intent === 'recommend' && !resourceNameUrl) {
      setError('Please provide the name and URL of the resource you want to recommend.')
      return
    }
    if (intent === 'bug' && !message) {
      setError('Please describe what is broken.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent,
          listing_ref: listingRef,
          message,
          bug_details: bugDetails,
          resource_name_url: resourceNameUrl,
          resource_additional: resourceAdditional,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      setResult(data.message || 'Thank you for your feedback!')
      setIntent('')
      setListingRef('')
      setMessage('')
      setBugDetails('')
      setResourceNameUrl('')
      setResourceAdditional('')
      if (onSuccess) onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to submit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Segment>
      <Form onSubmit={handleSubmit}>
        <Form.Select
          label="I want to..."
          placeholder="Choose an option"
          options={INTENT_OPTIONS}
          value={intent}
          onChange={(e, { value }) => setIntent(value)}
          required
        />

        {showListingRef && (
          <Form.Input
            label="URL or name of listing"
            placeholder="e.g. Casper Pride or https://..."
            value={listingRef}
            onChange={(e, { value }) => setListingRef(value)}
          />
        )}

        {showMessage && (
          <Form.TextArea
            label="I would like to say..."
            placeholder={intent === 'bug' ? 'Describe what is broken' : 'Your feedback or comments'}
            value={message}
            onChange={(e, { value }) => setMessage(value)}
            rows={4}
            required={intent === 'feedback' || intent === 'bug'}
          />
        )}

        {showBugDetails && (
          <Form.TextArea
            label="(Optional) Additional details"
            placeholder="What steps did you take before it broke? What browser or phone are you using?"
            value={bugDetails}
            onChange={(e, { value }) => setBugDetails(value)}
            rows={2}
          />
        )}

        {showResourceFields && (
          <>
            <Form.Input
              label="Name and URL of the resource(s) you want to recommend"
              placeholder="e.g. Resource Name - https://example.org"
              value={resourceNameUrl}
              onChange={(e, { value }) => setResourceNameUrl(value)}
              required
            />
            <Form.TextArea
              label="(Optional) Is there anything else you'd like to say about this resource?"
              placeholder="Additional details that would help us add this resource"
              value={resourceAdditional}
              onChange={(e, { value }) => setResourceAdditional(value)}
              rows={2}
            />
          </>
        )}

        {error && <Message negative>{error}</Message>}
        {result && <Message positive>{result}</Message>}

        <Button type="submit" primary loading={loading} disabled={loading}>
          Submit
        </Button>
      </Form>
    </Segment>
  )
}

export default FeedbackForm
