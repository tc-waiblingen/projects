import { CalendarIllustration, Crest, FlashMessage } from '@/components/tv'
import { getVisibleScreens, isHatSeasonInBerlin, isChampagneSeasonInBerlin } from '@/lib/tv'
import { HomeAutoTransition } from './HomeAutoTransition'
import { Snowflakes } from './Snowflakes'
import { Fireworks } from './Fireworks'

export const dynamic = 'force-dynamic'

export default function TvHomePage() {
  const screens = getVisibleScreens()
  const isHatSeason = isHatSeasonInBerlin()
  const isChampagneSeason = isChampagneSeasonInBerlin()

  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden">
      {/* Falling snowflakes - only during hat season */}
      {isHatSeason && <Snowflakes />}

      {/* Fireworks - only during champagne season */}
      {isChampagneSeason && <Fireworks />}

      {/* Dotted circle background */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg className="h-[80vh] w-[80vh]" viewBox="0 0 800 800">
          {[0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((radiusScale, ringIndex) => {
            const radius = 400 * radiusScale
            const circumference = 2 * Math.PI * radius
            const dotsInRing = Math.floor(circumference / 20)

            return Array.from({ length: dotsInRing }).map((_, dotIndex) => {
              const angle = (dotIndex / dotsInRing) * 2 * Math.PI
              const x = 400 + radius * Math.cos(angle)
              const y = 400 + radius * Math.sin(angle)

              return <circle key={`${ringIndex}-${dotIndex}`} cx={x} cy={y} r="2.5" fill="#C4B8A0" opacity="0.4" />
            })
          })}
        </svg>
      </div>

      {/* Sunburst rays */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg className="h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
          {[
            { angle: 12, length: 380, width: 8 },
            { angle: 35, length: 290, width: 4 },
            { angle: 58, length: 450, width: 10 },
            { angle: 82, length: 340, width: 6 },
            { angle: 103, length: 320, width: 5 },
            { angle: 128, length: 400, width: 7 },
            { angle: 145, length: 420, width: 9 },
            { angle: 171, length: 310, width: 4 },
            { angle: 197, length: 350, width: 6 },
            { angle: 218, length: 370, width: 8 },
            { angle: 239, length: 440, width: 10 },
            { angle: 261, length: 300, width: 5 },
            { angle: 284, length: 390, width: 7 },
            { angle: 305, length: 330, width: 6 },
            { angle: 331, length: 410, width: 9 },
            { angle: 352, length: 360, width: 5 },
          ].map(({ angle, length, width }) => {
            const angleRad = (angle * Math.PI) / 180
            const rayWidth = width
            const centerX = 500
            const centerY = 500
            const innerRadius = 100
            const outerRadius = length

            const centerLineX = centerX + outerRadius * Math.cos(angleRad)
            const centerLineY = centerY + outerRadius * Math.sin(angleRad)

            const perpAngle = angleRad + Math.PI / 2
            const offsetX = (rayWidth / 2) * Math.cos(perpAngle)
            const offsetY = (rayWidth / 2) * Math.sin(perpAngle)

            const innerX1 = centerX + innerRadius * Math.cos(angleRad) + offsetX
            const innerY1 = centerY + innerRadius * Math.sin(angleRad) + offsetY
            const innerX2 = centerX + innerRadius * Math.cos(angleRad) - offsetX
            const innerY2 = centerY + innerRadius * Math.sin(angleRad) - offsetY

            const outerX1 = centerLineX + offsetX
            const outerY1 = centerLineY + offsetY
            const outerX2 = centerLineX - offsetX
            const outerY2 = centerLineY - offsetY

            return (
              <g key={angle}>
                <polygon
                  points={`${innerX1},${innerY1} ${innerX2},${innerY2} ${outerX2},${outerY2} ${outerX1},${outerY1}`}
                  fill="#C4B8A0"
                  opacity="0.2"
                />
                <circle cx={centerLineX} cy={centerLineY} r={rayWidth / 2} fill="#C4B8A0" opacity="0.2" />
              </g>
            )
          })}
        </svg>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex h-full w-full items-center justify-center">
        <div className="relative flex flex-col items-center">
          <div className="relative flex h-[20vh] items-center justify-center">
            {isHatSeason && (
              <img
                src="/assets/tv/graphics/christmas-hat.svg"
                alt="Christmas hat"
                className="animate-fade-in-scale absolute z-20 w-[24vh] translate-x-[9vh] -translate-y-[22vh] rotate-12 [animation-delay:120ms]"
              />
            )}
            <Crest className="animate-fade-in-scale relative z-10 h-full drop-shadow-2xl" />
          </div>
          {isHatSeason && <FlashMessage>Wir wünschen allen Mitgliedern, Freunden und Gästen frohe Weihnachten.</FlashMessage>}
          {!isHatSeason && isChampagneSeason && (
            <FlashMessage>Wir wünschen allen Mitgliedern, Freunden und Gästen einen guten Rutsch und Start ins neue Jahr.</FlashMessage>
          )}
        </div>
      </div>

      {/* Screen illustrations - positioned at sunburst ray endpoints */}
      {screens.map((screen, index) => {
        const { angle, rayLength, illustrationPath, illustrationAlt } = screen.screenMeta
        const extraDistance = 120
        const angleRad = (angle * Math.PI) / 180
        const centerX = 50
        const centerY = 50
        const scale = 0.1
        const offsetX = (rayLength + extraDistance) * Math.cos(angleRad) * scale
        const offsetY = (rayLength + extraDistance) * Math.sin(angleRad) * scale

        const isCalendarIllustration = illustrationPath.includes('club-schedule-illustration')

        return (
          <a
            key={`screen-${index}`}
            href={`${screen.url}?stay=true`}
            className="absolute z-20 block w-64 transition-transform hover:scale-105 hover:shadow-xl"
            style={{
              left: `calc(${centerX}% + ${offsetX}vh)`,
              top: `calc(${centerY}% + ${offsetY}vh)`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {isCalendarIllustration ? (
              <CalendarIllustration className="h-auto w-full" />
            ) : (
              <img src={illustrationPath} alt={illustrationAlt} className="h-auto w-full" />
            )}
          </a>
        )
      })}

      {/* Transition overlays - one per screen */}
      {screens.map((screen, index) => {
        const { angle, rayLength } = screen.screenMeta
        const extraDistance = 120
        const angleRad = (angle * Math.PI) / 180
        const centerX = 50
        const centerY = 50
        const scale = 0.1
        const offsetX = (rayLength + extraDistance) * Math.cos(angleRad) * scale
        const offsetY = (rayLength + extraDistance) * Math.sin(angleRad) * scale

        return (
          <div
            key={`overlay-${index}`}
            id={`transition-overlay-${index}`}
            className="pointer-events-none fixed z-50"
            style={{
              left: `calc(${centerX}% + ${offsetX}vh)`,
              top: `calc(${centerY}% + ${offsetY}vh)`,
              width: '256px',
              height: '256px',
              borderRadius: '50%',
              backgroundColor: '#DDD5C0',
              transform: 'translate(-50%, -50%) scale(0)',
              opacity: '1',
            }}
          />
        )
      })}

      {/* Auto-transition script */}
      <HomeAutoTransition screens={screens} hasSeasonalMessage={isHatSeason || isChampagneSeason} />
    </div>
  )
}
