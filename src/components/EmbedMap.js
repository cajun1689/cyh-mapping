import React, { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Segment, Card, Dropdown, Form, Input, Icon } from "semantic-ui-react"
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from "react-leaflet"
import MarkerClusterGroup from 'react-leaflet-markercluster'

import 'leaflet/dist/leaflet.css'
import 'react-leaflet-markercluster/dist/styles.min.css'

import { filterListings, getCityCount } from '../utils'
import { blueLMarker } from '../resources/mapIcons'
import siteConfig from '../siteConfig.json'
import './Map.css'

function EmbedMap({ listings, metadata }) {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState()
  const [hideFaithBased, setHideFaithBased] = useState(searchParams.get('hide_faith') === '1')
  const [ageGroupFilter, setAgeGroupFilter] = useState(searchParams.get('age_group') || 'Youth')
  const showFaithToggle = searchParams.get('no_faith_toggle') !== '1'

  const filteredListings = useMemo(
    () => filterListings(listings, searchParams, search, [], { hideFaithBased, ageGroupFilter }),
    [listings, searchParams, search, hideFaithBased, ageGroupFilter]
  )

  const listingCities = useMemo(() => getCityCount(filteredListings ?? {}), [filteredListings])

  return (
    <div id="embed-wrapper" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#1B3A5C', padding: '.5em .75em', display: 'flex', gap: '.5em', alignItems: 'center', flexWrap: 'wrap' }}>
        <Input
          size="small"
          icon="search"
          iconPosition="left"
          placeholder="Search..."
          onChange={(e, { value }) => setSearch(value)}
          style={{ flex: 1, minWidth: '140px' }}
        />
        {Object.keys(listingCities).length > 0 && (
          <Dropdown
            options={Object.entries(listingCities).map(([c, n]) => ({ key: c, text: `${c} (${n})`, value: c }))}
            search selection clearable compact
            placeholder="Location"
            selectOnBlur={false}
            style={{ minWidth: '140px' }}
            value={searchParams.get('city') || ''}
            onChange={() => {}}
          />
        )}
        <Dropdown
          options={[
            { key: 'all', text: 'All Ages', value: 'all' },
            { key: 'Youth', text: 'Youth', value: 'Youth' },
            { key: 'Adult', text: 'Adult', value: 'Adult' },
          ]}
          selection compact
          value={ageGroupFilter}
          onChange={(e, { value }) => setAgeGroupFilter(value)}
          style={{ minWidth: '100px' }}
        />
        {showFaithToggle && (
          <Form.Checkbox
            toggle
            checked={!hideFaithBased}
            onChange={() => setHideFaithBased(!hideFaithBased)}
            label={<span style={{ color: hideFaithBased ? 'white' : 'yellow', fontSize: '.8em', whiteSpace: 'nowrap', marginLeft: '10px' }}>Include faith-based organizations</span>}
            style={{ margin: 0 }}
          />
        )}
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <EmbedMapContainer listings={filteredListings} />
      </div>
      <div style={{ background: '#1B3A5C', padding: '.35em .75em', textAlign: 'center' }}>
        <a href={siteConfig.siteUrl || window.location.origin} target="_blank" rel="noreferrer" style={{ color: '#fff', fontSize: '.8em', textDecoration: 'none' }}>
          <Icon name="map" size="small" /> {siteConfig.siteName}
        </a>
      </div>
    </div>
  )
}

const EmbedMapContainer = ({ listings }) => {
  return (
    <Segment as={MapContainer} center={siteConfig.mapCenter} zoom={siteConfig.mapZoom} minZoom={6} maxZoom={18} scrollWheelZoom={true} tap={true} dragging={true} touchZoom={true} style={{ height: '100%', width: '100%', margin: 0, padding: 0, border: 'none', borderRadius: 0 }}>
      <TileLayer attribution={siteConfig.siteName} url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
      <EmbedMarkers listings={listings} />
    </Segment>
  )
}

function EmbedMarkers({ listings }) {
  const map = useMap()
  const mappedListings = useMemo(() => listings.filter(({ coords: [lat, lon] }) => lat && lon), [listings])
  const bounds = useMemo(() => mappedListings.map(({ coords }) => coords), [mappedListings])
  useEffect(() => bounds.length && map.fitBounds(bounds), [map, bounds])

  return (
    <MarkerClusterGroup>
      {mappedListings.map(listing => (
        <Marker key={listing.guid} position={listing.coords} icon={blueLMarker} eventHandlers={{ click: ({ latlng }) => map.setView(latlng) }}>
          <Tooltip>{listing.full_name}</Tooltip>
          <Popup>
            <Card style={{ border: 'none', boxShadow: 'none' }}>
              <Card.Content>
                <Card.Header>{listing.full_name}</Card.Header>
                <Card.Meta>{listing.full_address}</Card.Meta>
                {listing.phone_1 && <Card.Description><Icon name="phone" /> {listing.phone_1}</Card.Description>}
                {listing.website && <Card.Description><a href={listing.website} target="_blank" rel="noreferrer"><Icon name="globe" /> Website</a></Card.Description>}
                <Card.Description style={{ marginTop: '.5em' }} className="description">{listing.description}</Card.Description>
              </Card.Content>
            </Card>
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  )
}

export default EmbedMap
