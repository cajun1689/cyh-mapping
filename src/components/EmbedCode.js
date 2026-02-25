import React, { useState } from 'react'
import { Container, Header, Segment, Form, Dropdown, Button, Icon, Message, Tab } from 'semantic-ui-react'
import siteConfig from '../siteConfig.json'

const ageGroupOptions = [
  { key: 'all', text: 'All (Youth & Adult)', value: '' },
  { key: 'Youth', text: 'Youth Only', value: 'Youth' },
  { key: 'Adult', text: 'Adult Only', value: 'Adult' },
]

function EmbedCodePage() {
  const [height, setHeight] = useState('600')
  const [ageGroup, setAgeGroup] = useState('')
  const [ageSelectable, setAgeSelectable] = useState(false)
  const [includeFaith, setIncludeFaith] = useState(true)
  const [showFaithToggle, setShowFaithToggle] = useState(true)
  const [copied, setCopied] = useState(false)

  const baseUrl = window.location.origin

  const dataAttrs = [
    ageGroup ? `data-filter="${ageGroup}"` : '',
    height !== '600' ? `data-height="${height}"` : '',
    ageSelectable ? 'data-age-select' : '',
    !includeFaith ? 'data-hide-faith' : '',
    !showFaithToggle ? 'data-no-faith-toggle' : '',
  ].filter(Boolean).join(' ')

  const scriptSnippet = `<div id="wyrm-map"${dataAttrs ? ' ' + dataAttrs : ''}></div>\n<script src="${baseUrl}/embed.js"></script>`

  const params = new URLSearchParams()
  if (ageGroup) params.set('age_group', ageGroup)
  if (ageSelectable) params.set('age_select', '1')
  if (!includeFaith) params.set('hide_faith', '1')
  if (!showFaithToggle) params.set('no_faith_toggle', '1')
  const queryString = params.toString()
  const iframeSnippet = `<iframe src="${baseUrl}/#/embed${queryString ? '?' + queryString : ''}" width="100%" height="${height}px" style="border:none; border-radius:8px;" loading="lazy" title="${siteConfig.siteName}"></iframe>`

  const previewUrl = `${baseUrl}/#/embed${queryString ? '?' + queryString : ''}`

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const CodeBlock = ({ code, label }) => (
    <>
      <pre style={{
        background: '#f5f5f5',
        padding: '1em',
        borderRadius: '6px',
        fontSize: '.85em',
        overflowX: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        border: '1px solid #ddd',
        margin: '0 0 .75em 0',
      }}>
        {code}
      </pre>
      <Button color="teal" fluid onClick={() => handleCopy(code)} style={{ marginBottom: '.5em' }}>
        <Icon name={copied ? 'check' : 'copy'} />
        {copied ? 'Copied!' : `Copy ${label}`}
      </Button>
    </>
  )

  const panes = [
    {
      menuItem: 'Script Tag (recommended)',
      render: () => (
        <Tab.Pane>
          <p style={{ color: '#555', marginBottom: '1em' }}>
            Paste this into your HTML. The map auto-sizes to its container width.
          </p>
          <CodeBlock code={scriptSnippet} label="Script Embed" />
        </Tab.Pane>
      ),
    },
    {
      menuItem: 'Raw iframe',
      render: () => (
        <Tab.Pane>
          <p style={{ color: '#555', marginBottom: '1em' }}>
            Use this if you can't add script tags (e.g. some CMS platforms).
          </p>
          <CodeBlock code={iframeSnippet} label="Iframe Code" />
        </Tab.Pane>
      ),
    },
  ]

  return (
    <Container as="main" style={{ maxWidth: '700px', marginTop: '2em', marginBottom: '3em' }}>
      <Header as="h1" style={{ textAlign: 'center' }}>
        <Icon name="code" />
        <Header.Content>
          Embed This Map
          <Header.Subheader>Add the {siteConfig.siteName} to your website</Header.Subheader>
        </Header.Content>
      </Header>

      <Segment>
        <Form>
          <Form.Group widths="equal">
            <Form.Field>
              <label>Default Age Group</label>
              <Dropdown
                options={ageGroupOptions}
                selection fluid
                value={ageGroup}
                onChange={(e, { value }) => setAgeGroup(value)}
              />
            </Form.Field>
            <Form.Input
              label="Height (px)"
              type="number"
              value={height}
              onChange={(e, { value }) => setHeight(value)}
              placeholder="600"
            />
          </Form.Group>
          <Form.Checkbox
            toggle
            checked={ageSelectable}
            onChange={() => setAgeSelectable(!ageSelectable)}
            label="Let visitors change the age group filter"
            style={{ marginTop: '.5em' }}
          />
          <Form.Checkbox
            toggle
            checked={showFaithToggle}
            onChange={() => setShowFaithToggle(!showFaithToggle)}
            label="Show faith-based toggle to visitors"
            style={{ marginTop: '.5em' }}
          />
          <Form.Checkbox
            toggle
            checked={includeFaith}
            onChange={() => setIncludeFaith(!includeFaith)}
            label="Include faith-based organizations by default"
            style={{ marginTop: '.5em' }}
          />
        </Form>
      </Segment>

      <Segment>
        <Header as="h4">
          <Icon name="clipboard" />
          <Header.Content>Embed Code</Header.Content>
        </Header>
        <Tab panes={panes} />
      </Segment>

      <Segment>
        <Header as="h4">Preview</Header>
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
          <iframe
            src={previewUrl}
            width="100%"
            height={`${height}px`}
            style={{ border: 'none', display: 'block' }}
            title="Map Preview"
          />
        </div>
      </Segment>

      <Message info>
        <Message.Header>Options</Message.Header>
        <Message.List>
          <Message.Item><code>data-filter</code> &mdash; Set to <strong>Youth</strong>, <strong>Adult</strong>, or leave out for all.</Message.Item>
          <Message.Item><code>data-age-select</code> &mdash; Add this attribute to let visitors change the age group themselves.</Message.Item>
          <Message.Item><code>data-hide-faith</code> &mdash; Hide faith-based organizations by default.</Message.Item>
          <Message.Item><code>data-no-faith-toggle</code> &mdash; Remove the faith-based toggle from the toolbar entirely.</Message.Item>
          <Message.Item><code>data-height</code> &mdash; Height in pixels (default 600).</Message.Item>
          <Message.Item>The map updates automatically when new resources are added.</Message.Item>
        </Message.List>
      </Message>
    </Container>
  )
}

export default EmbedCodePage
