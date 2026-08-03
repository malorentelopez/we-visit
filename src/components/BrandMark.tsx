/** We-Visit mark: a winding path ending in a pin. */
export function BrandMark({
  className = "h-14 w-14",
  title = "We-Visit",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <rect width="64" height="64" rx="18" fill="var(--bg1, #163a34)" />
      <rect
        x="1.5"
        y="1.5"
        width="61"
        height="61"
        rx="16.5"
        stroke="var(--accent-2, #7ec8b4)"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <path
        d="M14 46C18 38 22 34 28 32C34 30 36 26 34 20C32 14 38 12 44 16"
        stroke="var(--accent, #f28f4a)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="44" cy="16" r="5.5" fill="var(--accent, #f28f4a)" />
      <circle cx="44" cy="16" r="2.2" fill="var(--bg0, #0f2e2a)" />
      <circle cx="18" cy="42" r="2.2" fill="var(--accent-2, #7ec8b4)" />
      <circle cx="28" cy="32" r="2.2" fill="var(--accent-2, #7ec8b4)" />
    </svg>
  );
}

export function BrandWordmark({
  className = "",
  markClassName = "h-11 w-11",
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <div className={`brand-wordmark ${className}`.trim()}>
      <BrandMark className={markClassName} />
      <span className="brand-wordmark__text">We-Visit</span>
    </div>
  );
}
