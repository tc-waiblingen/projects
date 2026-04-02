import Image from 'next/image'
import { NavItems } from '@/components/nav/nav-items'
import { MobileNavigation } from '@/components/nav/nav-mobile-navigation'
import {
  NavbarLogo,
  NavbarWithLinksActionsAndCenteredLogo,
} from '@/components/sections/navbar-with-links-actions-and-centered-logo'
import { getSiteData } from '@/lib/directus/fetchers'
import { getEditAttr } from '@/lib/visual-editing'

export default async function NavbarDefault() {
  const { navMain, navCTA } = await getSiteData()

  return (
    <NavbarWithLinksActionsAndCenteredLogo
      id="navbar"
      links={
        <div data-directus={getEditAttr({ collection: 'navigation', item: navMain.id, fields: 'items' })}>
          <NavItems navigation={navMain} variant="links" />
        </div>
      }
      logo={
        <NavbarLogo href="/">
          <Image
            src="/assets/logo/tcw-logo-anniversary-light.svg"
            alt="100 Jahre Tennis-Club Waiblingen (1929-2026)"
            className="dark:hidden"
            width={188}
            height={54}
            loading="eager"
          />
          <Image
            src="/assets/logo/tcw-logo-anniversary-dark.svg"
            alt="100 Jahre Tennis-Club Waiblingen (1929-2026)"
            className="not-dark:hidden"
            width={188}
            height={54}
            loading="eager"
          />
        </NavbarLogo>
      }
      actions={
        <div data-directus={getEditAttr({ collection: 'navigation', item: navCTA.id, fields: 'items' })}>
          <NavItems navigation={navCTA} variant="actions" />
        </div>
      }
      mobileNavigation={<MobileNavigation navMain={navMain} navCTA={navCTA} />}
    />
  )
}
