import { Crest } from './Crest'

interface TcwLogoTextRightProps {
  href?: string
}

/**
 * TCW logo with optional text (currently showing anniversary logo).
 */
export function TcwLogoTextRight({ href = '/tv?stay=true' }: TcwLogoTextRightProps) {
  return (
    <a href={href} className="flex items-start gap-4 no-underline transition-opacity hover:opacity-80">
      <div className="flex items-start gap-4">
        <Crest className="h-14" />
        {/* Disabled for the anniversary logo */}
        {/* <div className="leading-[1.2]">
          <span className="font-bold">Tennis-Club </span>
          <br />
          <span className="font-bold">Waiblingen </span>
          <span className="font-light">e.V.</span>
        </div> */}
      </div>
    </a>
  )
}
