/* Playful animated blob backdrop inspired by Guivos brand mascots. */
export function BrandBackdrop({ variant = "hero" }: { variant?: "hero" | "quiet" }) {
  const blobs =
    variant === "hero"
      ? [
          { c: "bg-grape", size: 260, x: "-6%", y: "-8%", d: "anim-float" },
          { c: "bg-tangerine", size: 180, x: "88%", y: "6%", d: "anim-float-alt" },
          { c: "bg-mint", size: 140, x: "6%", y: "78%", d: "anim-float-alt" },
          { c: "bg-bubble", size: 110, x: "72%", y: "70%", d: "anim-float" },
          { c: "bg-lemon", size: 90, x: "44%", y: "92%", d: "anim-float-alt" },
          { c: "bg-sky", size: 70, x: "94%", y: "44%", d: "anim-float" },
        ]
      : [
          { c: "bg-grape-soft", size: 220, x: "-8%", y: "10%", d: "anim-float" },
          { c: "bg-lemon", size: 120, x: "92%", y: "70%", d: "anim-float-alt" },
          { c: "bg-mint", size: 80, x: "82%", y: "12%", d: "anim-float" },
        ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {blobs.map((b, i) => (
        <div
          key={i}
          className={`absolute rounded-full opacity-[0.16] blur-2xl ${b.c} ${b.d}`}
          style={{
            width: b.size,
            height: b.size,
            left: b.x,
            top: b.y,
            animationDelay: `${i * 0.6}s`,
          }}
        />
      ))}
    </div>
  );
}

/* Solid mascot blob – SVG stylized after the Guivos characters. */
export function Mascot({
  color = "grape",
  size = 96,
  className = "",
  wave = false,
}: {
  color?: "grape" | "tangerine" | "bubble" | "mint" | "sky" | "lemon";
  size?: number;
  className?: string;
  wave?: boolean;
}) {
  const fill = {
    grape: "var(--grape)",
    tangerine: "var(--tangerine)",
    bubble: "var(--bubble)",
    mint: "var(--mint)",
    sky: "var(--sky)",
    lemon: "var(--lemon)",
  }[color];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* shadow */}
      <ellipse cx="100" cy="176" rx="52" ry="6" fill="rgba(0,0,0,0.08)" />
      {/* legs */}
      <path d="M78 148 L74 176" stroke="#111" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M118 148 L124 176" stroke="#111" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* blob body */}
      <path
        d="M40 96 C40 52, 76 26, 108 30 C 152 34, 168 78, 158 116 C 150 148, 116 158, 92 154 C 60 148, 40 132, 40 96 Z"
        fill={fill}
      />
      {/* eyes */}
      <circle cx="86" cy="96" r="4" fill="#111" />
      <circle cx="118" cy="96" r="4" fill="#111" />
      {/* smile */}
      <path d="M88 112 Q102 122 116 112" stroke="#111" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* arm (optional wave) */}
      {wave && (
        <g className="anim-wobble" style={{ transformOrigin: "160px 90px" }}>
          <path d="M150 96 L172 74" stroke="#111" strokeWidth="4" strokeLinecap="round" fill="none" />
          <circle cx="174" cy="72" r="6" fill={fill} stroke="#111" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}
