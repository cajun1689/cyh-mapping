import React from 'react'
import { Container, Header, Segment, Item, Image } from 'semantic-ui-react'
import './SuggestUpdate.css'
import './About.css'
import siteConfig from '../siteConfig.json'

const MAC_URL = "https://mappingaction.org/"
const attributionStyle = {display: 'flex', alignSelf: 'center' }

const mappingActionAttribution = (
  <Item style={attributionStyle}>
    <Item.Content>
      Originally created by the {<a href={MAC_URL} target="_blank" rel="noreferrer">Mapping Action Collective</a>}
    </Item.Content>
  </Item>
)

function AboutPage () {
  return (
    <>
      <Container as="main" id="about-page">
        <Header as="h1" style={{marginTop: '1em', textAlign: 'center'}}>About</Header>
        <Segment as="article" basic vertical>
          {siteConfig.aboutText.map((paragraph, idx) => (
            <p key={idx}>
              {idx === 0 && <strong>{siteConfig.siteName}</strong>}
              {idx === 0 ? paragraph.replace(siteConfig.siteName, '') : paragraph}
            </p>
          ))}
        </Segment>
      </Container>
      <div style={{display: 'flex', justifyContent: 'center'}}>
        {siteConfig.logos.map(logo => <Image key={logo.alt} src={logo.src} alt={logo.alt} style={{height: '75px', margin: '10px 15px'}} />)}
      </div>
      {mappingActionAttribution}
      <p style={{marginTop: '15px'}}></p>
    </>
  )
}

export default AboutPage
