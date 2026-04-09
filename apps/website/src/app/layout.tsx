import { ClubOfficeInfo } from '@/components/sections/club-office-info'
import { Main } from '@/components/elements/main'
import { SearchProvider } from '@/components/search'
import { FooterNavItems } from '@/components/nav/footer-nav-items'
// import { GitHubIcon } from '@/components/icons/social/github-icon'
import { InstagramIcon } from '@/components/icons/social/instagram-icon'
import {
  FooterWithNewsletterFormCategoriesAndSocialIcons,
  SocialLink,
} from '@/components/sections/footer-with-newsletter-form-categories-and-social-icons'
import { SponsorsSection } from '@/components/sections/sponsors-section'
import type { Metadata } from 'next'
import { getSiteData } from '@/lib/directus/fetchers'
import { getEditAttr } from '@/lib/visual-editing'
import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const { globals } = await getSiteData()

  return {
    metadataBase: new URL(globals.website || process.env.NEXT_PUBLIC_SITE_URL || 'https://tc-waiblingen.de'),
    title: {
      default: globals.title ?? "",
      template: `%s · ${globals.title ?? ""}`,
    },
    description: globals.description ?? undefined,
  }
}

export default async function RootLayout({
  children,
  navbar,
}: Readonly<{
  children: React.ReactNode
  navbar: React.ReactNode
}>) {
  const { globals, navFooter, sponsors } = await getSiteData()

  // Make sure that globals.website does not end with a slash
  const baseUrl = globals.website?.endsWith('/')
    ? globals.website.slice(0, -1)
    : globals.website || '';

  const feedUrl = `${baseUrl}/api/rss/news`

  return (
    <html lang="de">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <link rel="apple-touch-icon" sizes="180x180" href="/assets/favicons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/assets/favicons/favicon-16x16.png" />
        <link rel="manifest" href="/assets/favicons/site.webmanifest" />
        <link rel="mask-icon" href="/assets/favicons/safari-pinned-tab.svg" color="#5bbad5" />
        <link rel="shortcut icon" href="/assets/favicons/favicon.ico" />
        <link rel="alternate" type="application/rss+xml" title={`${globals.club_name} – News`} href={`${feedUrl}`} />

        <meta name="msapplication-TileColor" content="#da532c" />
        <meta name="msapplication-config" content="/assets/favicons/browserconfig.xml" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-itunes-app" content="app-id=6444000701" />
      </head>
      <body>
        <>
          <SearchProvider />
          {navbar}

          <Main>{children}</Main>

          <FooterWithNewsletterFormCategoriesAndSocialIcons
            id="footer"
            sponsors={<SponsorsSection sponsors={sponsors} />}
            cta={<ClubOfficeInfo />}
            links={<FooterNavItems navigation={navFooter} />}
            fineprint=""
            socialLinks={
              <>
                <SocialLink
                  href={globals.instagram || ""}
                  name="Instagram"
                  contentDataDirectus={getEditAttr({ collection: 'globals', item: String(globals.id), fields: 'instagram' })}
                >
                  <InstagramIcon />
                </SocialLink>
                {/* <SocialLink href="https://github.com/tc-waiblingen/" name="GitHub">
                  <GitHubIcon />
                </SocialLink> */}
              </>
            }
          />
        </>
      </body>
    </html>
  )
}
