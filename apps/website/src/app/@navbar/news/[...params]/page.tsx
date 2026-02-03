import Image from 'next/image'
import { NavItems } from '@/components/nav/nav-items'
import { MobileNavigation } from '@/components/nav/nav-mobile-navigation'
import {
  NavbarLogo,
  NavbarWithLinksActionsAndCenteredLogo,
} from '@/components/sections/navbar-with-links-actions-and-centered-logo'
import { getSiteData } from '@/lib/directus/fetchers'

interface NavbarSlotProps {
  params: Promise<{ params: string[] }>
}

export default async function NavbarSlot({ params }: NavbarSlotProps) {
  const { params: pathParams } = await params
  const currentPath = '/news/' + pathParams.join('/')
  const { navMain, navCTA } = await getSiteData()

  return (
    <NavbarWithLinksActionsAndCenteredLogo
      id="navbar"
      links={<NavItems navigation={navMain} variant="links" currentPath={currentPath} />}
      logo={
        <NavbarLogo href="/">
          <Image
            src="/assets/logo/tcw-logo-anniversary-light.svg"
            alt="100 Jahre Tennis-Club Waiblingen (1929-2026)"
            className="dark:hidden"
            width={188}
            height={54}
          />
          <Image
            src="/assets/logo/tcw-logo-anniversary-dark.svg"
            alt="100 Jahre Tennis-Club Waiblingen (1929-2026)"
            className="not-dark:hidden"
            width={188}
            height={54}
          />
        </NavbarLogo>
      }
      actions={<NavItems navigation={navCTA} variant="actions" />}
      mobileNavigation={<MobileNavigation navMain={navMain} navCTA={navCTA} currentPath={currentPath} />}
    />
  )
}
