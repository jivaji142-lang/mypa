import { useState, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

const THRESHOLD = 60;
const RESISTANCE = 0.4;

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
}

export function PullToRefresh({ children, onRefresh }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    } else {
      startY.current = 0;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startY.current || refreshing) return;
    const delta = (e.touches[0].clientY - startY.current) * RESISTANCE;
    if (delta > 0) {
      setPullDistance(delta);
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (refreshing) return;
    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      try {
        if (onRefresh) {
          await onRefresh();
        } else {
          await queryClient.invalidateQueries();
        }
      } finally {
        setRefreshing(false);
      }
    }
    setPullDistance(0);
    startY.current = 0;
  }, [pullDistance, refreshing, onRefresh]);

  const showSpinner = refreshing || pullDistance >= THRESHOLD;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative h-full overflow-y-auto"
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200 ease-out"
        style={{ height: refreshing ? 48 : Math.min(pullDistance, 80) }}
      >
        <Loader2
          className={`w-6 h-6 text-[#00BAF2] ${showSpinner ? "animate-spin" : ""}`}
          style={{
            opacity: Math.min(pullDistance / THRESHOLD, 1),
            transform: `rotate(${pullDistance * 3}deg)`,
          }}
        />
      </div>
      {children}
    </div>
  );
}
