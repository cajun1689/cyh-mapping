import React, { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Segment, Card, Dropdown, Form, Grid, Input, Icon } from "semantic-ui-react"
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from "react-leaflet"
import MarkerClusterGroup from 'react-leaflet-markercluster'

import 'leaflet/dist/leaflet.css'
import 'react-leaflet-markercluster/dist/styles.min.css'

import { filterListings, getCityCount, getKeywordCount, getCostCount } from '../utils'
import { blueLMarker } from '../resources/mapIcons'
import siteConfig from '../siteConfig.json'
import './Map.css'

function EmbedMap({ listings, metadata }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState()
  const [hideFaithBased, setHideFaithBased] = useState(searchParams.get('hide_faith') === '1')
  const [ageGroupFilter, setAgeGroupFilter] = useState(searchParams.get('age_group') || 'Youth')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [costFilter, setCostFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const showFaithToggle = searchParams.get('no_faith_toggle') !== '1'
  const prideGradient = 'linear-gradient(90deg, #E40303, #FF8C00, #FFED00, #008026, #004DFF, #750787)'
  const rawToolbar = searchParams.get('toolbar_color')
  const toolbarBg = rawToolbar === 'pride' ? prideGradient : rawToolbar ? `#${rawToolbar}` : '#1B3A5C'
  const accentColor = searchParams.get('accent_color') ? `#${searchParams.get('accent_color')}` : '#F5C518'

  const { listingCategoryIcons, listingCategories } = metadata || {}

  const localFilteredListings = useMemo(() => {
    let result = listings
    if (categoryFilter) result = result.filter(l => l.category === categoryFilter)
    if (tagFilter) result = result.filter(l => {
      const entries = Object.entries(l).join(' ').toLowerCase()
      return entries.includes(tagFilter.toLowerCase())
    })
    if (costFilter) result = result.filter(l => l.cost_keywords && l.cost_keywords.includes(costFilter))
    if (cityFilter) result = result.filter(l => l.city === cityFilter)
    return result
  }, [listings, categoryFilter, tagFilter, costFilter, cityFilter])

  const cleanParams = useMemo(() => {
    const clean = new URLSearchParams(searchParams)
    ;['toolbar_color', 'accent_color', 'hide_faith', 'no_faith_toggle', 'age_select'].forEach(k => clean.delete(k))
    return clean
  }, [searchParams])

  const filteredListings = useMemo(
    () => filterListings(localFilteredListings, cleanParams, search, [], { hideFaithBased, ageGroupFilter }),
    [localFilteredListings, cleanParams, search, hideFaithBased, ageGroupFilter]
  )

  const listingCities = useMemo(() => getCityCount(localFilteredListings ?? []), [localFilteredListings])
  const keywordCount = useMemo(() => getKeywordCount(localFilteredListings ?? []), [localFilteredListings])
  const costCount = useMemo(() => getCostCount(localFilteredListings ?? []), [localFilteredListings])

  const keywordOptions = Object.entries(keywordCount).map(([k, n]) => ({ key: k, text: `${k} (${n})`, value: k }))
  const costOptions = Object.entries(costCount).map(([k, n]) => ({ key: k, text: `${k} (${n})`, value: k }))
  const cityOptions = Object.entries(listingCities).map(([c, n]) => ({ key: c, text: `${c} (${n})`, value: c }))

  return (
    <div id="embed-wrapper" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {listingCategories && (
        <div style={{ background: toolbarBg, padding: '.4em 0', display: 'flex', justifyContent: 'center', gap: '1.5em', flexWrap: 'wrap' }}>
          {Object.entries(listingCategories).map(([parentCategory, subCategories]) => (
            <Dropdown key={parentCategory} icon={null} pointing="top"
              trigger={
                <div style={{ textAlign: 'center', cursor: 'pointer', color: 'white', fontSize: '.75em', opacity: categoryFilter && !categoryFilter.startsWith(parentCategory) ? 0.5 : 1 }}>
                  <Icon name={listingCategoryIcons?.[parentCategory]?.icon || 'folder'} size="big" />
                  <div>{parentCategory}</div>
                </div>
              }>
              <Dropdown.Menu>
                {Object.entries(subCategories).map(([sub, count]) => (
                  <Dropdown.Item key={sub} text={`${sub} (${count})`}
                    active={categoryFilter === `${parentCategory}: ${sub}`}
                    onClick={() => setCategoryFilter(categoryFilter === `${parentCategory}: ${sub}` ? '' : `${parentCategory}: ${sub}`)}
                  />
                ))}
              </Dropdown.Menu>
            </Dropdown>
          ))}
        </div>
      )}
      <div style={{ background: toolbarBg, padding: '.5em .75em', display: 'flex', gap: '.5em', alignItems: 'center', flexWrap: 'wrap' }}>
        <Input
          size="small"
          icon="search"
          iconPosition="left"
          placeholder="Search..."
          onChange={(e, { value }) => setSearch(value)}
          style={{ flex: 1, minWidth: '120px' }}
        />
        {cityOptions.length > 0 && (
          <Dropdown
            options={cityOptions}
            search selection clearable compact
            placeholder="Location"
            selectOnBlur={false}
            style={{ minWidth: '120px' }}
            value={cityFilter}
            onChange={(e, { value }) => setCityFilter(value || '')}
          />
        )}
        {keywordOptions.length > 0 && (
          <Dropdown
            options={keywordOptions}
            search selection clearable compact
            placeholder="Service Type"
            selectOnBlur={false}
            style={{ minWidth: '120px' }}
            value={tagFilter}
            onChange={(e, { value }) => setTagFilter(value || '')}
          />
        )}
        {costOptions.length > 0 && (
          <Dropdown
            options={costOptions}
            search selection clearable compact
            placeholder="Cost"
            selectOnBlur={false}
            style={{ minWidth: '100px' }}
            value={costFilter}
            onChange={(e, { value }) => setCostFilter(value || '')}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
            <Form.Checkbox
              toggle
              fitted
              checked={!hideFaithBased}
              onChange={() => setHideFaithBased(!hideFaithBased)}
              style={{ margin: 0 }}
            />
            <span style={{ color: hideFaithBased ? 'white' : accentColor, fontSize: '.8em', whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => setHideFaithBased(!hideFaithBased)}>Include faith-based organizations</span>
          </div>
        )}
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <EmbedMapContainer listings={filteredListings} />
      </div>
      <div style={{ background: toolbarBg, padding: '.35em .75em', textAlign: 'center' }}>
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
