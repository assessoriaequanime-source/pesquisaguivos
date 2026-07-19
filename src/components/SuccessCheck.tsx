export function SuccessCheck({ size = 96 }: { size?: number }) {
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span
        className="absolute inset-0 rounded-full bg-mint/25"
        style={{ animation: "sc-halo 1.6s cubic-bezier(0.22,1,0.36,1) 0.15s both" }}
      />
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle at 50% 50%, oklch(0.86 0.16 155) 0%, oklch(0.72 0.16 155) 100%)",
          animation: "sc-pop 0.55s cubic-bezier(0.34,1.56,0.64,1) both",
          boxShadow: "0 18px 40px -14px oklch(0.72 0.16 155 / 0.55)",
        }}
      />
      <svg
        viewBox="0 0 52 52"
        className="relative"
        style={{ width: size * 0.55, height: size * 0.55 }}
        fill="none"
        stroke="white"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M14 27 L23 36 L39 18"
          style={{
            strokeDasharray: 44,
            strokeDashoffset: 44,
            animation: "sc-draw 0.6s cubic-bezier(0.65,0,0.35,1) 0.35s forwards",
          }}
        />
      </svg>
      <style>{`
        @keyframes sc-pop {
          0% { transform: scale(0.4); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes sc-halo {
          0% { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes sc-draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
