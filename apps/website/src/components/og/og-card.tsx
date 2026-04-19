interface OgCardProps {
  title: string
  kicker?: string
  crestSrc: string
  siteName: string
}

const COLORS = {
  background: '#faf8f6',
  stripe: '#b5351d',
  title: '#2c2623',
  muted: '#6a5d54',
}

export function OgCard({ title, kicker, crestSrc, siteName }: OgCardProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundColor: COLORS.background,
      }}
    >
      <div
        style={{
          width: 16,
          height: '100%',
          backgroundColor: COLORS.stripe,
        }}
      />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 96px',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse requires a plain <img> and cannot use next/image */}
        <img src={crestSrc} width={128} height={128} alt="" />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {kicker && (
            <div
              style={{
                fontSize: 32,
                fontWeight: 500,
                color: COLORS.muted,
                marginBottom: 16,
                letterSpacing: 0.5,
              }}
            >
              {kicker}
            </div>
          )}
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              lineHeight: 1.1,
              color: COLORS.title,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {title}
          </div>
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: COLORS.muted,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {siteName}
        </div>
      </div>
    </div>
  )
}
