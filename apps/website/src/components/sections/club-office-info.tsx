import Link from 'next/link'
import { ContactInfo } from '@/components/elements/contact-info'
import { getSiteData } from '@/lib/directus/fetchers'
import { getEditAttr } from '@/lib/visual-editing'
import { OfficeClosingDay } from '@/types/directus-schema'

// Map English day names to German
const dayNameMap: Record<string, string> = {
  'monday': 'Montag',
  'tuesday': 'Dienstag',
  'wednesday': 'Mittwoch',
  'thursday': 'Donnerstag',
  'friday': 'Freitag',
  'saturday': 'Samstag',
  'sunday': 'Sonntag'
}

// Format time string (remove seconds)
function formatTime(timeStr: string) {
  const [hours, minutes] = timeStr.split(':')
  return `${hours}:${minutes}`
}

/**
 * Format closing days for display.
 * @param {Array} closingDays - Array of closing day objects
 * @returns {Array} Formatted closing day strings
 */
function formatClosingDays(closingDays: OfficeClosingDay[]) {
  return closingDays
    .slice(0, 5)
    .map(day => {
      const date = new Date(day.date + 'T00:00:00')
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    })
}

export async function ClubOfficeInfo() {
  const { globals, officeHours, officeClosingDays } = await getSiteData()

  return (
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
  )
}
