/**
 * Fireworks animation for New Year season.
 */
export function Fireworks() {
  const rockets = [
    { xStart: 48, launchDistance: -35, angle: -8, drift: -3, delay: 0 },
    { xStart: 52, launchDistance: -32, angle: 12, drift: 4, delay: 1.5 },
    { xStart: 45, launchDistance: -38, angle: -15, drift: -5, delay: 3 },
    { xStart: 55, launchDistance: -34, angle: 10, drift: 3, delay: 4.5 },
    { xStart: 50, launchDistance: -36, angle: -5, drift: -2, delay: 6 },
  ]

  const colors = ['#FFD700', '#FFA500', '#FF6B35', '#F0E68C', '#FFEA00', '#FFB84D']
  const particles = 30

  return (
    <>
      {rockets.map((rocket, rocketIndex) => (
        <div
          key={`firework-${rocketIndex}`}
          className="firework-container"
          style={{
            left: `${rocket.xStart}%`,
            top: '50%',
            animationDelay: `${rocket.delay}s`,
          }}
        >
          {/* Rocket */}
          <div
            className="firework-rocket"
            style={{
              animationDelay: `${rocket.delay}s`,
              // @ts-expect-error CSS custom properties
              '--launch-distance': rocket.launchDistance,
              '--drift': `${rocket.drift}vw`,
              '--angle': `${rocket.angle}deg`,
            }}
          />

          {/* Burst particles */}
          <div
            className="firework-burst-container"
            style={{
              top: `${rocket.launchDistance}vh`,
              left: `${rocket.drift}vw`,
            }}
          >
            {Array.from({ length: particles }).map((_, i) => {
              const angle = (i / particles) * Math.PI * 2
              const distance = 100 + Math.random() * 60
              const x = Math.cos(angle) * distance
              const y = Math.sin(angle) * distance
              const color = colors[Math.floor(Math.random() * colors.length)]

              return (
                <div
                  key={`particle-${i}`}
                  className="firework-particle"
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 0 15px ${color}, 0 0 30px ${color}, 0 0 45px ${color}`,
                    animationDelay: `${rocket.delay}s`,
                    // @ts-expect-error CSS custom properties
                    '--x': `${x}px`,
                    '--y': `${y}px`,
                  }}
                />
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}
