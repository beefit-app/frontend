import React, { useRef, useState } from "react";

interface InteractiveTabPagerProps {
  activeIndex: number;
  onChangeIndex: (index: number) => void;
  children: [React.ReactNode, React.ReactNode];
  className?: string;
  style?: React.CSSProperties;
}

export function InteractiveTabPager({
  activeIndex,
  onChangeIndex,
  children,
  className = "",
  style,
}: InteractiveTabPagerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const isTrackingRef = useRef(false);
  const isSwipingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const numTabs = 2;

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    startTimeRef.current = Date.now();
    isTrackingRef.current = true;
    isSwipingRef.current = false;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isTrackingRef.current) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - startXRef.current;
    const diffY = touch.clientY - startYRef.current;

    if (!isSwipingRef.current) {
      if (Math.abs(diffX) > 8 && Math.abs(diffX) > Math.abs(diffY) * 1.1) {
        isSwipingRef.current = true;
        setIsDragging(true);
      } else if (Math.abs(diffY) > 8) {
        isTrackingRef.current = false;
        return;
      }
    }

    if (isSwipingRef.current) {
      // Resistencia elastica nas bordas
      let effectiveDiff = diffX;
      if (
        (activeIndex === 0 && diffX > 0) ||
        (activeIndex === numTabs - 1 && diffX < 0)
      ) {
        effectiveDiff = diffX * 0.28;
      }
      setDragOffset(effectiveDiff);
    }
  }

  function handleTouchEnd() {
    if (!isTrackingRef.current || !isSwipingRef.current) {
      isTrackingRef.current = false;
      isSwipingRef.current = false;
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    const duration = Math.max(1, Date.now() - startTimeRef.current);
    const velocity = dragOffset / duration;
    const threshold = 40;

    let targetIndex = activeIndex;
    if (dragOffset < -threshold || velocity < -0.35) {
      if (activeIndex < numTabs - 1) {
        targetIndex = activeIndex + 1;
      }
    } else if (dragOffset > threshold || velocity > 0.35) {
      if (activeIndex > 0) {
        targetIndex = activeIndex - 1;
      }
    }

    isTrackingRef.current = false;
    isSwipingRef.current = false;
    setIsDragging(false);
    setDragOffset(0);

    if (targetIndex !== activeIndex) {
      onChangeIndex(targetIndex);
    }
  }

  const basePercent = -activeIndex * 50;
  const containerWidth = containerRef.current?.clientWidth || (typeof window !== "undefined" ? window.innerWidth : 360);
  const offsetPercent = containerWidth > 0 ? (dragOffset / (containerWidth * 2)) * 100 : 0;
  const currentPercent = basePercent + offsetPercent;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`relative w-full overflow-hidden ${className}`}
      style={{ minHeight: "100%", ...style }}
    >
      <div
        style={{
          display: "flex",
          width: "200%",
          transform: `translate3d(${currentPercent}%, 0, 0)`,
          transition: isDragging ? "none" : "transform 280ms cubic-bezier(0.25, 1, 0.5, 1)",
          willChange: "transform",
          alignItems: "flex-start",
        }}
      >
        <div style={{ width: "50%", minWidth: "50%", flexShrink: 0, boxSizing: "border-box" }}>
          {children[0]}
        </div>
        <div style={{ width: "50%", minWidth: "50%", flexShrink: 0, boxSizing: "border-box" }}>
          {children[1]}
        </div>
      </div>
    </div>
  );
}
