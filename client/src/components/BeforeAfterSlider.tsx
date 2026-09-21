import React, { useState, useRef, useCallback, useEffect } from "react";
import { MoveHorizontal, Sparkles, Move3D } from "lucide-react";

interface BeforeAfterSliderProps {
  beforeImage?: string;
  afterImage?: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImage,
  afterImage,
  beforeLabel = "Compact Mode",
  afterLabel = "Expanded Mode",
  className = "",
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50); // percentage 0 - 100
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let percentage = (x / rect.width) * 100;
    if (percentage < 2) percentage = 2;
    if (percentage > 98) percentage = 98;
    setSliderPosition(percentage);
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;
      handleMove(e.touches[0].clientX);
    },
    [isDragging, handleMove]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    },
    [isDragging, handleMove]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  // Fade out badges when their respective layer is mostly covered
  const afterTagOpacity = sliderPosition > 75 ? Math.max(0, 1 - (sliderPosition - 75) / 18) : 1;
  const beforeTagOpacity = sliderPosition < 25 ? Math.max(0, (sliderPosition - 7) / 18) : 1;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[340px] md:min-h-[460px] overflow-hidden select-none group rounded-md ${className}`}
      style={{ touchAction: "none" }}
      onMouseDown={(e) => {
        setIsDragging(true);
        handleMove(e.clientX);
      }}
      onTouchStart={(e) => {
        setIsDragging(true);
        handleMove(e.touches[0].clientX);
      }}
    >
      {/* AFTER LAYER (FULL BACKGROUND / TRANSFORMATION STATE) */}
      <div className="absolute inset-0 w-full h-full bg-[#525f44] flex items-center justify-center overflow-hidden">
        {afterImage ? (
          <>
            <img
              src={afterImage}
              alt={afterLabel}
              className="w-full h-full object-cover object-center pointer-events-none"
            />
            <div
              className="absolute top-4 right-4 z-10 px-3.5 py-1.5 rounded-full bg-[#1f2923]/80 text-[#f5f2ea] text-[11px] font-mono tracking-wider uppercase backdrop-blur-md border border-white/20 shadow-md flex items-center gap-1.5 pointer-events-none transition-opacity duration-150"
              style={{ opacity: afterTagOpacity }}
            >
              <Sparkles size={13} className="text-[#e89b78]" /> {afterLabel}
            </div>
          </>
        ) : (
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#4d5a3e] via-[#5c6b4b] to-[#3b472e] p-6">
            <div className="absolute top-8 right-8 w-44 h-44 rounded-full bg-[#dca36d]/30 blur-2xl pointer-events-none" />
            <div className="relative z-10 text-center max-w-sm">
              <div className="w-56 h-32 md:w-72 md:h-40 bg-[#f5f2ea]/90 rounded-xl shadow-2xl mx-auto mb-6 flex items-center justify-center border border-white/20 transform rotate-1">
                <div className="w-16 h-24 bg-[#c86e4b] rounded-md mr-3 shadow-md" />
                <div className="w-32 h-14 bg-[#8a9973] rounded-md shadow-inner" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f5f2ea]/15 text-[#f5f2ea] text-xs font-mono tracking-wider uppercase backdrop-blur-sm">
                <Sparkles size={13} className="text-[#e89b78]" /> {afterLabel}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* BEFORE LAYER (CLIPPED TOP LAYER / COMPACT STATE) */}
      <div
        className="absolute inset-0 h-full overflow-hidden bg-[#384131] border-r border-[#bb6849]/50 shadow-2xl transition-[width] duration-75 ease-out"
        style={{ width: `${sliderPosition}%` }}
      >
        <div
          className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden"
          style={{
            width: containerRef.current
              ? `${containerRef.current.getBoundingClientRect().width}px`
              : "100vw",
          }}
        >
          {beforeImage ? (
            <>
              <img
                src={beforeImage}
                alt={beforeLabel}
                className="w-full h-full object-cover object-center pointer-events-none"
              />
              <div
                className="absolute top-4 left-4 z-10 px-3.5 py-1.5 rounded-full bg-[#1f2923]/80 text-[#f5f2ea] text-[11px] font-mono tracking-wider uppercase backdrop-blur-md border border-white/20 shadow-md flex items-center gap-1.5 pointer-events-none transition-opacity duration-150"
                style={{ opacity: beforeTagOpacity }}
              >
                <Move3D size={13} className="text-[#9cb086]" /> {beforeLabel}
              </div>
            </>
          ) : (
            <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-[#2b3327] via-[#3d4736] to-[#485440] p-6">
              <div className="absolute bottom-6 left-6 w-36 h-36 rounded-full bg-[#bb6849]/20 blur-xl pointer-events-none" />
              <div className="relative z-10 text-center max-w-sm">
                <div className="w-40 h-40 md:w-48 md:h-48 bg-[#f5f2ea] rounded-xl shadow-2xl mx-auto mb-6 flex flex-col items-center justify-center border border-white/10 transform -rotate-1">
                  <div className="w-24 h-24 bg-[#4a553c] rounded-lg shadow-md mb-2" />
                  <div className="w-28 h-4 bg-[#bb6849] rounded-sm" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f5f2ea]/15 text-[#f5f2ea] text-xs font-mono tracking-wider uppercase backdrop-blur-sm">
                  <Move3D size={13} className="text-[#9cb086]" /> {beforeLabel}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SLIDER HANDLE LINE & KNOB */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-[#f5f2ea] shadow-[0_0_14px_rgba(0,0,0,0.5)] pointer-events-none transition-[left] duration-75 ease-out z-20"
        style={{ left: `calc(${sliderPosition}% - 2px)` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 md:w-11 md:h-11 rounded-full bg-[#1f2923] text-[#f5f2ea] border-2 border-[#f5f2ea] shadow-2xl flex items-center justify-center cursor-ew-resize transition-transform duration-150 group-hover:scale-110 active:scale-95">
          <MoveHorizontal size={18} className="text-[#bb6849]" />
        </div>
      </div>

      {/* DRAG INSTRUCTION BADGE */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
        <span className="px-3.5 py-1.5 rounded-full bg-[#1f2923]/80 text-[#f5f2ea] text-[10px] md:text-xs font-mono tracking-widest uppercase backdrop-blur-md border border-white/15 shadow-lg">
          Drag to compare
        </span>
      </div>
    </div>
  );
};
