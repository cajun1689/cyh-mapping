import React, { useState } from 'react'
import {HashRouter as Router, Route, Routes} from 'react-router-dom'

import './index.css'
import Page from './components/Page'
import Map from './components/Map'
import EmbedMap from './components/EmbedMap'
import EmbedCode from './components/EmbedCode'

import { CONTENT } from './constants'
import { getCategoryCount } from './utils'

import About from './components/About'
import Resources from './components/Resources'
import SuggestUpdate from './components/SuggestUpdate'

function App({listings, metadata}) {
  const {ABOUT_TEXT, DISCLAIMER, VIDEO_TUTORIAL_LINK, RUBRIC_TEXT, CONTRIBUTORS, FORMS } = CONTENT 
  const resources = metadata.resources ?? null
  if (!metadata?.categoryCount) metadata.categoryCount = getCategoryCount(listings)

  const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '')
  const [ageGroupFilter, setAgeGroupFilter] = useState(hashParams.get('age_group') || 'Youth')
  const isEmbed = window.location.hash.startsWith('#/embed') && !window.location.hash.startsWith('#/embed-code')

  if (isEmbed) {
    return (
      <Router>
        <Routes>
          <Route path="/embed" element={<EmbedMap listings={listings} metadata={metadata} />} />
          <Route path="/embed/:markerId" element={<EmbedMap listings={listings} metadata={metadata} />} />
        </Routes>
      </Router>
    )
  }

  return (
    <Router>
      <Page disclaimer={DISCLAIMER} aboutText={ABOUT_TEXT} resources={resources} ageGroupFilter={ageGroupFilter}>
        <Routes>
          {ABOUT_TEXT && <Route path="/about" element={
            <About aboutText={ABOUT_TEXT} contributors={CONTRIBUTORS} disclaimer={DISCLAIMER} videoLink={VIDEO_TUTORIAL_LINK} rubric={RUBRIC_TEXT} />}
          />}
          {resources && <Route path="/resources" element={<Resources resources={resources} />} />}
          <Route path="/embed-code" element={<EmbedCode />} />
          <Route path="/suggest" element={<SuggestUpdate forms={FORMS} />} />
          <Route path="/suggest/:listingId" element={<SuggestUpdate />} />
          <Route path="/" element={<Map listings={listings} metadata={metadata} ageGroupFilter={ageGroupFilter} setAgeGroupFilter={setAgeGroupFilter} />} />
          <Route path=":markerId" element={<Map listings={listings} metadata={metadata} ageGroupFilter={ageGroupFilter} setAgeGroupFilter={setAgeGroupFilter} />} />
        </Routes>
      </Page>
    </Router>
  )
}

export default App;
