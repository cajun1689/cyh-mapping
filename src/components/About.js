import React from 'react'
import { Container, Header, Segment, Item, Image } from 'semantic-ui-react'
import './SuggestUpdate.css'
import './About.css'
import siteConfig from '../siteConfig.json'

const ExternalLink = ({ href, children }) => (
  <a href={href} target="_blank" rel="noreferrer">{children}</a>
)

const attributionStyle = {display: 'flex', alignSelf: 'center' }

function AboutPage () {
  return (
    <>
      <Container as="main" id="about-page">
        <Header as="h1" style={{marginTop: '1em', textAlign: 'center'}}>About</Header>
        <Segment as="article" basic vertical>
          <p>
            The <strong>{siteConfig.siteName}</strong>, developed by{' '}
            <ExternalLink href="https://www.casperyouthhub.org/">Casper Youth Hub</ExternalLink>,
            in partnership with{' '}
            <ExternalLink href="https://www.unicornsolutions.org">Unicorn Solutions</ExternalLink>,
            is designed to help young people ages 11-20 and their allies connect to youth-serving
            resources, organizations, and leadership opportunities across Wyoming.
          </p>
          <p>
            The map centers youth needs and voices, and includes services for health and mental
            healthcare, housing, education, and more.
          </p>
          <p>
            This tool was adapted from the{' '}
            <ExternalLink href="https://github.com/mapping-action-collective">Oregon Youth Resource Map</ExternalLink>,
            originally created by the{' '}
            <ExternalLink href="https://mappingaction.org/">Mapping Action Collective</ExternalLink>,
            in partnership with Youth and Young Adult Leaders from across the state of Oregon for
            the{' '}
            <ExternalLink href="https://www.samhsa.gov/grants/grant-announcements/sm-18-010">Healthy Transitions</ExternalLink>{' '}
            program, and customized for Wyoming youth by the{' '}
            <ExternalLink href="https://www.casperyouthhub.org/">Casper Youth Hub</ExternalLink>.
          </p>
        </Segment>
      </Container>
      <div style={{display: 'flex', justifyContent: 'center'}}>
        {siteConfig.logos.map(logo => <Image key={logo.alt} src={logo.src} alt={logo.alt} style={{height: '75px', margin: '10px 15px'}} />)}
      </div>
      <Item style={attributionStyle}>
        <Item.Content>
          Originally created by the <ExternalLink href="https://mappingaction.org/">Mapping Action Collective</ExternalLink>
        </Item.Content>
      </Item>
      <p style={{marginTop: '15px'}}></p>
    </>
  )
}

export default AboutPage
