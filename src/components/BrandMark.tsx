/** Same mark as favicon / PWA icons (`/logo.png`). */
export function BrandMark({
  className = "h-14 w-14",
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static brand asset from /public
    <img
      src="/logo.png?v=4"
      alt={title ?? ""}
      className={`brand-mark ${className}`.trim()}
      width={512}
      height={512}
      draggable={false}
      aria-hidden={title ? undefined : true}
    />
  );
}

/** Mark + wordmark lockup for hero and chrome. */
export function BrandLogo({
  className = "",
  size = "hero",
}: {
  className?: string;
  size?: "hero" | "compact";
}) {
  return (
    <div
      className={`brand-logo brand-logo--${size} ${className}`.trim()}
      aria-label="We Visit"
      role="img"
    >
      <span className="brand-logo__mark-wrap">
        <BrandMark className="brand-logo__mark" />
      </span>
      <span className="brand-logo__word" aria-hidden>
        <span className="brand-logo__we">We</span>
        <span className="brand-logo__visit">
          Visit
          <span className="brand-logo__dot" />
        </span>
      </span>
    </div>
  );
}
