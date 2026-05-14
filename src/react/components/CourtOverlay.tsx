export type ServiceSide = 'team1' | 'team2';

interface CourtOverlayProps {
  server?: ServiceSide | null;
  serverScore?: number;
  ariaLabel?: string;
}

// SVG viewBox is 320x200 — half = 160 wide.
//   – Doubles back boundary  ≈ 18 SVG units from the outer edge.
//   – Short service line     ≈ 47 units from the net (centre at x=160).
//   – Singles sidelines      ≈ 14 units from the long edges.
const COURT = {
  width: 320,
  height: 200,
  netX: 160,
  redShortServiceX: 113,
  redBackServiceX: 18,
  blueShortServiceX: 207,
  blueBackServiceX: 302,
  centerY: 100,
  singlesInsetY: 14,
};

const SERVICE_DOT: Record<
  'redTop' | 'redBottom' | 'blueTop' | 'blueBottom',
  { cx: number; cy: number }
> = {
  redTop: { cx: 65, cy: 55 },
  redBottom: { cx: 65, cy: 145 },
  blueTop: { cx: 255, cy: 55 },
  blueBottom: { cx: 255, cy: 145 },
};

function getServiceDot(server: ServiceSide, score: number) {
  const isEven = score % 2 === 0;
  if (server === 'team1') {
    // Red player faces the net (looking right): their right service court is
    // the bottom half of the red side. Even score → right court.
    return isEven ? SERVICE_DOT.redBottom : SERVICE_DOT.redTop;
  }
  // Blue player faces the opposite direction: their right service court is
  // the top half of the blue side. Even score → right court.
  return isEven ? SERVICE_DOT.blueTop : SERVICE_DOT.blueBottom;
}

export function CourtOverlay({
  server,
  serverScore = 0,
  ariaLabel,
}: CourtOverlayProps) {
  const dot = server ? getServiceDot(server, serverScore) : null;
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${COURT.width} ${COURT.height}`}
      preserveAspectRatio="xMidYMid meet"
      stroke="rgba(255,255,255,0.85)"
      fill="none"
      strokeWidth={2}
      strokeLinecap="square"
      role={ariaLabel ? 'img' : 'presentation'}
      aria-label={ariaLabel}
    >
      {/* Outer doubles boundary */}
      <rect x={0.5} y={0.5} width={COURT.width - 1} height={COURT.height - 1} />

      {/* Singles inner sidelines */}
      <line
        x1={0}
        y1={COURT.singlesInsetY}
        x2={COURT.width}
        y2={COURT.singlesInsetY}
      />
      <line
        x1={0}
        y1={COURT.height - COURT.singlesInsetY}
        x2={COURT.width}
        y2={COURT.height - COURT.singlesInsetY}
      />

      {/* Red half — short service line, doubles back service line, centre line */}
      <line
        x1={COURT.redShortServiceX}
        y1={0}
        x2={COURT.redShortServiceX}
        y2={COURT.height}
      />
      <line
        x1={COURT.redBackServiceX}
        y1={0}
        x2={COURT.redBackServiceX}
        y2={COURT.height}
      />
      <line
        x1={0}
        y1={COURT.centerY}
        x2={COURT.redShortServiceX}
        y2={COURT.centerY}
      />

      {/* Blue half — mirrored */}
      <line
        x1={COURT.blueShortServiceX}
        y1={0}
        x2={COURT.blueShortServiceX}
        y2={COURT.height}
      />
      <line
        x1={COURT.blueBackServiceX}
        y1={0}
        x2={COURT.blueBackServiceX}
        y2={COURT.height}
      />
      <line
        x1={COURT.blueShortServiceX}
        y1={COURT.centerY}
        x2={COURT.width}
        y2={COURT.centerY}
      />

      {/* Service indicator */}
      {dot && (
        <g>
          <circle
            cx={dot.cx}
            cy={dot.cy}
            r={8}
            fill="rgba(255,255,255,0.95)"
            stroke="rgba(0,0,0,0.25)"
            strokeWidth={1.5}
          >
            <animate
              attributeName="r"
              values="8;10;8"
              dur="1.4s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      )}
    </svg>
  );
}
