import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'TCW TV',
    template: '%s · TCW TV',
  },
  robots: 'noindex, nofollow',
}

export default function TvLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Global animation styles for TV transitions - static CSS only, no user input */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes screen-transition {
              0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 1;
              }
              100% {
                transform: translate(-50%, -50%) scale(20);
                opacity: 1;
              }
            }

            @keyframes fade-in-scale {
              0% {
                opacity: 0;
                transform: scale(0.95);
              }
              100% {
                opacity: 1;
                transform: scale(1);
              }
            }

            .animate-fade-in-scale {
              animation: fade-in-scale 0.5s ease-out forwards;
            }

            /* Snowflake animation */
            @keyframes snowfall {
              0% {
                transform: translateY(-100vh) translateX(0);
                opacity: 0;
              }
              10% {
                opacity: 1;
              }
              90% {
                opacity: 1;
              }
              100% {
                transform: translateY(100vh) translateX(var(--drift, 0px));
                opacity: 0;
              }
            }

            .snowflake {
              position: fixed;
              top: 0;
              z-index: 100;
              color: white;
              text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
              animation: snowfall linear infinite;
              pointer-events: none;
            }

            /* Firework animations */
            @keyframes firework-rocket {
              0% {
                opacity: 1;
                transform: translateY(0) translateX(0) rotate(var(--angle, 0deg));
              }
              80% {
                opacity: 1;
              }
              100% {
                opacity: 0;
                transform: translateY(calc(var(--launch-distance) * 1vh)) translateX(var(--drift, 0)) rotate(var(--angle, 0deg));
              }
            }

            @keyframes firework-burst {
              0% {
                opacity: 0;
                transform: translate(0, 0) scale(0);
              }
              10% {
                opacity: 1;
                transform: translate(0, 0) scale(0.3);
              }
              100% {
                opacity: 0;
                transform: translate(var(--x), var(--y)) scale(1);
              }
            }

            .firework-container {
              position: fixed;
              pointer-events: none;
              z-index: 100;
              animation: firework-container 7.5s linear infinite;
            }

            .firework-rocket {
              position: absolute;
              width: 4px;
              height: 16px;
              background: linear-gradient(to bottom, #FFD700, #FFA500);
              border-radius: 2px;
              animation: firework-rocket 0.8s ease-out forwards;
              box-shadow: 0 0 10px #FFD700, 0 0 20px #FFA500;
            }

            .firework-burst-container {
              position: absolute;
            }

            .firework-particle {
              position: absolute;
              width: 6px;
              height: 6px;
              border-radius: 50%;
              animation: firework-burst 1.5s ease-out 0.8s forwards;
              opacity: 0;
            }

            /* Instagram carousel styles */
            .carousel-card {
              position: absolute;
              width: 25vw;
              height: 75vh;
              transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
              transform-origin: center center;
            }

            .carousel-position-0 {
              left: -5vw;
              top: 50%;
              transform: translateY(-50%) scale(0.5);
              opacity: 0.3;
              z-index: 1;
            }

            .carousel-position-1 {
              left: 10vw;
              top: 50%;
              transform: translateY(-50%) scale(0.7);
              opacity: 0.5;
              z-index: 2;
            }

            .carousel-position-2 {
              left: 50%;
              top: 50%;
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
              z-index: 3;
            }

            .carousel-position-3 {
              left: calc(100% - 10vw - 25vw);
              top: 50%;
              transform: translateY(-50%) scale(0.7);
              opacity: 0.5;
              z-index: 2;
            }

            .carousel-position-4 {
              left: calc(100% + 5vw - 25vw);
              top: 50%;
              transform: translateY(-50%) scale(0.5);
              opacity: 0.3;
              z-index: 1;
            }

            .carousel-card.entering {
              animation: carousel-enter 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            }

            @keyframes carousel-enter {
              from {
                opacity: 0;
                transform: translateY(-50%) scale(0.3) translateX(100px);
              }
            }
          `,
        }}
      />
      {children}
    </>
  )
}
