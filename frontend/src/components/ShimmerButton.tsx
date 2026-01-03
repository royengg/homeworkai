
interface ShimmerButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  shimmerColor?: string;
  shimmerSize?: string;
  shimmerDuration?: string;
  borderRadius?: string;
  background?: string;
}

export function ShimmerButton({
  children,
  onClick,
  className,
  shimmerColor = "#ffffff",
  shimmerSize = "0.05em",
  shimmerDuration = "3s",
  borderRadius = "9999px",
  background = "rgb(30, 41, 59)", // bg-slate-800
}: ShimmerButtonProps) {
  return (
    <button
      onClick={onClick}
      style={
        {
          "--spread": "90deg",
          "--shimmer-color": shimmerColor,
          "--radius": borderRadius,
          "--speed": shimmerDuration,
          "--cut": shimmerSize,
          "--bg": background,
        } as React.CSSProperties
      }
      className={`group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-6 py-3 font-medium text-white [background:var(--bg)] [border-radius:var(--radius)] transition-all duration-300 hover:scale-[1.02] active:scale-95 ${className}`}
    >
      {/* Shimmer container */}
      <div
        className="absolute inset-0 -z-20 overflow-visible [container-type:size]"
      >
        <div className="absolute inset-0 h-[100cqh] animate-shimmer-slide [aspect-ratio:1] [border-radius:0] [mask:none]">
        </div>
      </div>
       
      <div className="absolute inset-0 -z-10 block opacity-20 bg-[linear-gradient(110deg,transparent,45%,var(--shimmer-color),55%,transparent)] bg-[length:200%_100%] animate-shimmer" />

      {children}
    </button>
  );
}
