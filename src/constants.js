import siteConfig from './siteConfig.json'

export const CONTENT = {
  "ABOUT_TEXT": siteConfig.aboutText.join("\n\n"),
  "DISCLAIMER": siteConfig.disclaimer,
  "FOOTER_DISCLAIMER": siteConfig.footerDisclaimer,
  "VIDEO_TUTORIAL_LINK": null,
  "RUBRIC_TEXT": null,
  "FORMS": siteConfig.forms,
  "CONTRIBUTORS": siteConfig.contributors,
  "MORE_RESOURCES": siteConfig.moreResources
}
