const GOLD = "#e3a64a";
const GOLD_DARK = "#c07f2c";
const CREAM = "#f3cf8a";
const INK = "#2b1b0e";
const MOUTH = "#7a4a1c";
const TONGUE = "#e8707a";
const CAP = "#0a1633";
const CAP_TOP = "#1c3170";
const TASSEL = "#f2b632";

type Side = "right" | "top";

/**
 * Each pose is two layers laid over each other at the same size: the dog
 * behind the card and its paws in front of it.
 *
 * - right: leans out past the card's right edge. The viewBox's horizontal
 *   centre (x = 88) is the edge; `right-0 translate-x-1/2` pins it there, so
 *   the dog overhangs by half its width.
 * - top: pops up over the card's top edge. The viewBox ends at the edge
 *   (y = 49) and sits on it via `bottom-full`; the paws overflow onto the card.
 */
const POSES = {
  right: {
    viewBox: "0 0 176 190",
    layer: "right-0 translate-x-1/2 motion-safe:animate-peek",
    defaultClassName: "top-12 w-44",
  },
  top: {
    viewBox: "0 0 64 49",
    layer: "bottom-full overflow-visible motion-safe:animate-peek-up",
    defaultClassName: "right-8 w-28",
  },
} as const;

/**
 * A golden retriever graduate peeking out from behind a card and holding on
 * to its edge. Purely decorative.
 *
 * Usage: a `relative isolate` wrapper holding `<PeekingDog />` and the card in
 * a `relative z-10` box. On the right side the dog overhangs by half its
 * width, so give the wrapper that much right margin on `lg` (`lg:mr-24` for
 * the default `w-44`). `className` overrides the pose's size and position.
 */
export function PeekingDog({
  side = "right",
  className,
}: {
  side?: Side;
  className?: string;
}) {
  const pose = POSES[side];
  const layer = `pointer-events-none absolute hidden lg:block ${pose.layer} ${
    className ?? pose.defaultClassName
  }`;

  return (
    <>
      <svg viewBox={pose.viewBox} aria-hidden="true" className={`${layer} z-0`}>
        {side === "right" ? <LeaningDog /> : <PoppingUpDog />}
      </svg>
      <svg
        viewBox={pose.viewBox}
        aria-hidden="true"
        className={`${layer} z-20`}
      >
        {side === "right" ? (
          <>
            <Paw x={89} y={146} />
            <Paw x={91} y={171} />
          </>
        ) : (
          <>
            <Paw x={20} y={49} rotate={-90} scale={0.45} />
            <Paw x={47} y={49} rotate={-90} scale={0.45} />
          </>
        )}
      </svg>
    </>
  );
}

/** Right edge: the head tilts down toward the card; the body stays hidden. */
function LeaningDog() {
  return (
    <>
      <g transform="rotate(-28 118 110)">
        <g transform="translate(54 47) scale(2)">
          <Head />
        </g>
      </g>

      {/* The tassel hangs straight down, so it is drawn untilted: from the
          board's button (96.4, 69.4) to its right corner, then down. */}
      <path
        fill="none"
        stroke={TASSEL}
        strokeLinecap="round"
        strokeWidth="1.8"
        d="M96.4 69.4 133.5 49.7v22"
      />
      <circle cx="96.4" cy="69.4" r="2.6" fill={TASSEL} />
      <path fill={TASSEL} d="M130.3 70h6.4l1.6 13h-9.6z" />
    </>
  );
}

/** Top edge: the head pops up with a slight tilt; the chin hides behind it. */
function PoppingUpDog() {
  return (
    <g transform="rotate(-8 32 30)">
      <Head />
      <path
        fill="none"
        stroke={TASSEL}
        strokeLinecap="round"
        strokeWidth=".9"
        d="M32 8.5 50 11v9"
      />
      <circle cx="32" cy="8.5" r="1.3" fill={TASSEL} />
      <path fill={TASSEL} d="M48.4 19.5h3.2l.8 6.5h-4.8z" />
    </g>
  );
}

/** Face, ears and cap on the logo's 64-unit grid (tassel drawn per pose). */
function Head() {
  return (
    <>
      <path
        fill={GOLD}
        d="M14 30c0-12 8-19 18-19s18 7 18 19v4c0 11-8 18-18 18s-18-7-18-18z"
      />
      <path
        fill={GOLD_DARK}
        d="M21 14c-9.5-.5-15 9.5-14 22 .6 7.6 6.2 10.6 10.2 7.5 3-2.3 3.6-7.6 3.8-13z"
      />
      <path
        fill={GOLD_DARK}
        d="M43 14c9.5-.5 15 9.5 14 22-.6 7.6-6.2 10.6-10.2 7.5-3-2.3-3.6-7.6-3.8-13z"
      />
      <path
        fill={CREAM}
        d="M32 33c-6.8 0-11.5 3.6-11.5 8.6S25.2 51 32 51s11.5-4.4 11.5-9.4S38.8 33 32 33z"
      />
      <path
        fill="none"
        stroke={CREAM}
        strokeLinecap="round"
        strokeWidth="1.6"
        d="M22.6 25.4c1.6-1.4 3.8-1.6 5.4-.6m13.4.6c-1.6-1.4-3.8-1.6-5.4-.6"
      />
      {/* Pupils sit a little left, glancing at the card. */}
      <circle cx="25" cy="29.6" r="2.7" fill={INK} />
      <circle cx="37.8" cy="29.6" r="2.7" fill={INK} />
      <circle cx="25.9" cy="28.8" r=".9" fill="#fff" />
      <circle cx="38.7" cy="28.8" r=".9" fill="#fff" />
      <path fill={TONGUE} d="M29.6 44c0 4.2 1.1 6.4 2.4 6.4s2.4-2.2 2.4-6.4z" />
      <path
        fill={INK}
        d="M27.8 36.8c0-2.2 8.4-2.2 8.4 0 0 2.3-2.3 4-4.2 4s-4.2-1.7-4.2-4z"
      />
      <path
        fill="none"
        stroke={MOUTH}
        strokeLinecap="round"
        strokeWidth="1.4"
        d="M32 40.8v2.6m0 0c-1.4 2-3.8 2.2-5.2.6m5.2-.6c1.4 2 3.8 2.2 5.2.6"
      />

      {/* Graduation cap: skull band and mortarboard. */}
      <path fill={CAP} d="M21 10.5h22v5.5c0 2-22 2-22 0z" />
      <path fill={CAP_TOP} d="M32 2.5 53 8.5 32 14.5 11 8.5z" />
    </>
  );
}

/**
 * A front paw wrapped over the card's edge. Unrotated, the toes point left
 * (for the right edge); `rotate={-90}` points them down (for the top edge).
 */
function Paw({
  x,
  y,
  rotate = 0,
  scale = 1,
}: {
  x: number;
  y: number;
  rotate?: number;
  scale?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <ellipse
        rx="12.5"
        ry="10"
        fill={GOLD}
        stroke={GOLD_DARK}
        strokeWidth="1.2"
      />
      <path
        fill="none"
        stroke={GOLD_DARK}
        strokeLinecap="round"
        strokeWidth="1.4"
        d="M-12 -3.4h6M-12 3.4h6"
      />
    </g>
  );
}
