import React from 'react'
import { Container, Header, Segment, Item, Image } from 'semantic-ui-react'
import './SuggestUpdate.css'
import macLogo from './../resources/mac-logo.png'

import './About.css'

const attributionStyle = {display: 'flex', alignSelf: 'center' }

const MAC_URL = "https://mappingaction.org/"
const mappingActionAttribution = (
  <Item style={attributionStyle}>
    <Item.Content>
      Originally created by the {<a href={MAC_URL} target="_blank" rel="noreferrer">Mapping Action Collective</a>}
    </Item.Content>
  </Item>
)

const logos = [
 { src: macLogo, alt: 'Mapping Action Collective Logo' },
]

function AboutPage () {
  return (
    <>
      <Container as="main" id="about-page">
        <Header as="h1" style={{marginTop: '1em', textAlign: 'center'}}>About</Header>
        <Segment as="article" basic vertical>
          <p>
            The <strong>Casper Youth Hub Resource Map</strong> is designed to help young people ages 11-20 and their allies
            connect to youth-serving resources, organizations, and leadership opportunities across Wyoming.
          </p>
          <p>
            The map centers youth needs and voices, and includes services for health and mental healthcare,
            housing, education, and more.
          </p>
          <p>
            This tool was adapted from the <a href="https://github.com/mapping-action-collective" target="_blank" rel="noreferrer">Oregon Youth Resource Map</a>, 
            originally created by the Mapping Action Collective, and customized for Wyoming youth by the Casper Youth Hub.
          </p>
        </Segment>
      </Container>
      <div style={{display: 'flex', justifyContent: 'center'}}>
        {logos.map(logo => <Image key={logo.alt} src={logo.src} alt={logo.alt} style={{height: '75px', margin: '10px 15px'}} />)}
      </div>
      {mappingActionAttribution}
      <p style={{marginTop: '15px'}}></p>
    </>
  )
}

export default AboutPage
