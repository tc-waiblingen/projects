import Image from 'next/image'
import { NavItems } from '@/components/nav/nav-items'
import { MobileNavigation } from '@/components/nav/nav-mobile-navigation'
import {
  NavbarLogo,
  NavbarWithLinksActionsAndCenteredLogo,
} from '@/components/sections/navbar-with-links-actions-and-centered-logo'
import { getHeaderNavigation } from '@/lib/directus/fetchers'
import { getEditAttr } from '@/lib/visual-editing'

export async function Navbar({ currentPath }: { currentPath?: string }) {
  const { navMain, navCTA } = await getHeaderNavigation()

  return (
    <NavbarWithLinksActionsAndCenteredLogo
      id="navbar"
      links={<NavItems navigation={navMain} variant="links" currentPath={currentPath} />}
      linksDataDirectus={getEditAttr({ collection: 'navigation', item: navMain.id, fields: 'items' })}
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
      actions={<NavItems navigation={navCTA} variant="actions" />}
      actionsDataDirectus={getEditAttr({ collection: 'navigation', item: navCTA.id, fields: 'items' })}
      mobileNavigation={<MobileNavigation navMain={navMain} navCTA={navCTA} currentPath={currentPath} />}
    />
  )
}
