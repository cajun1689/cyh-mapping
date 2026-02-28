import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Icon, Menu, Segment } from 'semantic-ui-react'
import siteConfig from '../siteConfig.json'

import 'semantic-ui-css/semantic.min.css'
import './Page.css'

function Page({aboutText, resources, children, ageGroupFilter}) {
  const displayName = ageGroupFilter === 'Youth' ? siteConfig.siteName : siteConfig.siteNameShort
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const closeNav = () => setMobileNavOpen(false)

  const navLinks = [
    aboutText && { to: '/about', label: 'About' },
    resources && { to: '/resources', label: 'More Resources' },
    { to: '/embed-code', label: 'Embed' },
    { to: '/suggest', label: 'Suggest Update' },
  ].filter(Boolean)

  return (<>
    <Segment as="header" basic vertical inverted>
      <Menu as="nav" size="massive" secondary pointing className="container">
        <Menu.Item as={NavLink} to="/" end className="site-brand" onClick={closeNav}>{displayName}</Menu.Item>
        {navLinks.map((link, i) => (
          <Menu.Item key={link.to} as={NavLink} to={link.to} className="nav-link" {...(i === 0 ? { position: 'right' } : {})}><header>{link.label}</header></Menu.Item>
        ))}
        <button className="hamburger-btn" onClick={() => setMobileNavOpen(!mobileNavOpen)} aria-label="Toggle navigation">
          <Icon name={mobileNavOpen ? 'close' : 'bars'} />
        </button>
      </Menu>
      <div className={`mobile-nav-drawer ${mobileNavOpen ? 'open' : ''}`}>
        {navLinks.map(link => (
          <NavLink key={link.to} to={link.to} className={({isActive}) => `item ${isActive ? 'active' : ''}`} onClick={closeNav}>{link.label}</NavLink>
        ))}
      </div>
    </Segment>
    {children}
  </>)
}

export default Page
