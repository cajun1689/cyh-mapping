import { NavLink, Outlet } from 'react-router-dom'
import { Menu, Segment } from 'semantic-ui-react'
import siteConfig from '../siteConfig.json'

import 'semantic-ui-css/semantic.min.css'
import './Page.css'

function Page({aboutText, resources}) {
  return (<>
    <Segment as="header" basic vertical inverted>
      <Menu as="nav" size="massive" secondary pointing className="container">
        <Menu.Item as={NavLink} to="/" end className="site-brand">{siteConfig.siteNameShort}</Menu.Item>
        {aboutText && <Menu.Item as={NavLink} to="/about" position="right"><header>About</header></Menu.Item>}
        {resources && <Menu.Item as={NavLink} to="/resources"><header>More Resources</header></Menu.Item>}
        <Menu.Item as={NavLink} to="/embed-code"><header>Embed</header></Menu.Item>
        <Menu.Item as={NavLink} to="/suggest"><header>Suggest Update</header></Menu.Item>
      </Menu>
    </Segment>
    <Outlet />
  </>)
}

export default Page
