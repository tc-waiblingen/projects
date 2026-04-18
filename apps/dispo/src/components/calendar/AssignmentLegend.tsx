export function AssignmentLegend() {
  return (
    <div className="mb-6 w-full">
      <svg
        viewBox="0 0 560 190"
        className="mx-auto block h-auto w-full max-w-[560px]"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Legende: Auslastung und Zuweisung pro Tag"
      >
        <g className="text-muted" stroke="currentColor" strokeWidth="0.75" fill="none" opacity="0.45">
          <polyline points="272,108 240,148 220,148" />
          <polyline points="292,85 345,85" />
          <polyline points="347,62 352,50" />
        </g>
        <g className="text-muted" fill="currentColor" opacity="0.55">
          <circle cx="272" cy="108" r="1.8" />
          <circle cx="292" cy="85" r="1.8" />
          <circle cx="347" cy="62" r="1.8" />
        </g>

        <g>
          <path d="M 240 70 L 240 120 L 320 120 Z" fill="rgb(82 82 91 / 0.8)" />
          <path d="M 240 70 L 320 70 L 320 120 Z" fill="rgb(194 65 12 / 0.9)" />
          <line x1="240" y1="70" x2="320" y2="120" stroke="rgba(0,0,0,0.45)" strokeWidth="1.25" />
          <rect x="240" y="70" width="80" height="50" rx="6" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
          <text x="280" y="103" textAnchor="middle" fontSize="16" fontWeight="500" fill="white">18</text>
          <text x="324" y="67" fontSize="11" fontWeight="700" fill="currentColor" className="text-body">2+3</text>
        </g>

        <foreignObject x="0" y="122" width="220" height="60">
          <div className="pr-2 text-right text-[11px] leading-tight">
            <div className="font-semibold text-body">Auslastung</div>
            <div className="mt-1 flex flex-wrap justify-end gap-x-2 gap-y-0.5 text-muted">
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded align-middle bg-zinc-400/80" />
                niedrig
              </span>
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded align-middle bg-zinc-600/80" />
                mittel
              </span>
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded align-middle bg-zinc-800/80" />
                hoch
              </span>
            </div>
          </div>
        </foreignObject>

        <foreignObject x="345" y="68" width="215" height="110">
          <div className="pl-2 text-[11px] leading-tight">
            <div className="font-semibold text-body">Zuweisung</div>
            <div className="mt-1 flex flex-col gap-0.5 text-muted">
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded align-middle bg-red-900/85" />
                keine
              </span>
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded align-middle bg-orange-700/90" />
                unvollständig
              </span>
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded align-middle bg-green-800/90" />
                passt
              </span>
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded align-middle bg-emerald-500/75" />
                mehr als nötig
              </span>
            </div>
          </div>
        </foreignObject>

        <foreignObject x="352" y="32" width="208" height="36">
          <div className="pl-2 text-[11px] leading-tight text-muted">
            <div>
              <strong className="text-body">N+N</strong>: Platzbedarf vorm./nachm.
            </div>
            <div>
              <strong className="text-body">T</strong>: Turnier
            </div>
          </div>
        </foreignObject>
      </svg>
    </div>
  )
}
