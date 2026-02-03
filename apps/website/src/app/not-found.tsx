import { ButtonLink } from '@/components/elements/button'
import { SearchSuggestions } from '@/components/search'

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-24 text-center">
      <h1>Seite nicht gefunden</h1>
      <p className="mt-4 max-w-md text-taupe-600 dark:text-taupe-300">
        Die angeforderte Seite existiert nicht oder wurde verschoben.
      </p>

      <ButtonLink size="lg" href="/" className="mt-8">
        Zur Startseite
      </ButtonLink>

      <SearchSuggestions />
    </div>
  )
}
