import React from 'react'
import { useParams } from 'react-router-dom'
import { Container, Tab } from 'semantic-ui-react'
import FeedbackForm from './FeedbackForm'
import SubmitResourceForm from './SubmitResourceForm'
import './SuggestUpdate.css'

function SuggestUpdate({ forms, metadata, apiUrl, listings }) {
  const { listingId } = useParams()
  const apiBase = apiUrl || (window.location.hostname === 'localhost' ? 'http://localhost:5050/api' : `${window.location.origin}/api`)
  const listingRef = listingId && listings?.length
    ? (listings.find((l) => String(l.guid) === String(listingId))?.full_name || listingId)
    : ''

  const panes = [
    {
      menuItem: 'General Feedback',
      render: () => (
        <Tab.Pane className="suggest-tab-pane">
          <p className="suggest-subtitle">Give feedback on the site, comment on a listing, or report a bug</p>
          <FeedbackForm apiUrl={apiBase} initialListingRef={listingRef} />
        </Tab.Pane>
      ),
    },
    {
      menuItem: 'Submit a Resource',
      render: () => (
        <Tab.Pane className="suggest-tab-pane">
          <p className="suggest-subtitle">For providers: add your organization to the map</p>
          <SubmitResourceForm apiUrl={apiBase} metadata={metadata} />
        </Tab.Pane>
      ),
    },
  ]

  return (
    <Container as="main" id="suggest-update-page">
      <Tab menu={{ secondary: true, pointing: true }} panes={panes} />
    </Container>
  )
}

export default SuggestUpdate
