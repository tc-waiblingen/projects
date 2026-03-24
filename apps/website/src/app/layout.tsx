import Link from 'next/link'
import { ContactInfo } from '@/components/elements/contact-info'
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
import { OfficeClosingDay } from "@/types/directus-schema"
import { getEditAttr } from '@/lib/visual-editing'
import './globals.css'

/**
 * Format closing days for display.
 * @param {Array} closingDays - Array of closing day objects
 * @returns {Array} Formatted closing day strings
 */
function formatClosingDays(closingDays: OfficeClosingDay[]) {
  return closingDays
    .slice(0, 5)
    .map(day => {
      const date = new Date(day.date + 'T00:00:00');
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    });
}

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
  const { globals, officeHours, officeClosingDays, navFooter, sponsors } = await getSiteData()

  // Map English day names to German
  const dayNameMap: Record<string, string> = {
    'monday': 'Montag',
    'tuesday': 'Dienstag',
    'wednesday': 'Mittwoch',
    'thursday': 'Donnerstag',
    'friday': 'Freitag',
    'saturday': 'Samstag',
    'sunday': 'Sonntag'
  };

  // Format time string (remove seconds)
  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    return `${hours}:${minutes}`;
  };

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
            cta={
              <>
                <div>
                  <h3>Kontakt</h3>

                  <table className="mt-2 text-muted">
                    <tbody>
                      <tr>
                        <td className="pr-2">Telefon:</td>
                        <td>
                          <span data-directus={getEditAttr({ collection: 'globals', item: String(globals.id), fields: 'phone' })}>
                            <ContactInfo type="phone" value={globals.phone ?? ''} name={globals.club_name ?? undefined} />
                          </span>
                        </td>
                      </tr>

                      <tr>
                        <td className="pr-2">E-Mail:</td>
                        <td>
                          <span data-directus={getEditAttr({ collection: 'globals', item: String(globals.id), fields: 'email' })}>
                            <ContactInfo type="email" value={globals.email ?? ''} name={globals.club_name ?? undefined} />
                          </span>
                        </td>
                      </tr>

                      <tr>
                        <td className="pr-2">Adresse:</td>
                        <td>
                          <span data-directus={getEditAttr({ collection: 'globals', item: String(globals.id), fields: ['address_street', 'address_zip_code', 'address_city', 'address_maps_url'] })}>
                            <Link href={globals.address_maps_url || ""} target="_blank" rel="noopener noreferrer">
                              {globals.address_street}, {globals.address_zip_code} {globals.address_city}
                            </Link>
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <h3 className="mt-2">Öffnungszeiten</h3>

                  <table className="mt-2 text-muted">
                    <tbody>
                      {officeHours.map((oh) => (
                        <tr key={oh.day} data-directus={getEditAttr({ collection: 'office_hours', item: String(oh.id), fields: ['day', 'starts_at', 'ends_at'] })}>
                          <td className="pr-2">{dayNameMap[oh.day]}:</td>
                          <td>{formatTime(oh.starts_at)} – {formatTime(oh.ends_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {officeClosingDays?.length > 0 && officeClosingDays[0] && (
                    <div
                      className="text-red-700 dark:text-red-200"
                      data-directus={getEditAttr({ collection: 'office_closing_days', item: String(officeClosingDays[0].id), fields: 'date', mode: 'drawer' })}
                    >
                      Ausnahmsweise geschlossen am: {formatClosingDays(officeClosingDays).join(', ')}
                    </div>
                  )}
                </div>
              </>
            }
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
