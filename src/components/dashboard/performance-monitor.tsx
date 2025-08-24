import { Profiler, ProfilerOnRenderCallback, useEffect, useState } from "react";

interface PerformanceData {
  id: string;
  phase: string;
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  count: number;
}

interface PerformanceMonitorProps {
  children: React.ReactNode;
  id: string;
  threshold?: number; // Duration threshold in ms to log warnings
}

export function PerformanceMonitor({ 
  children, 
  id, 
  threshold = 16 // 16ms = 60fps
}: PerformanceMonitorProps) {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);

  const handleProfilerRender: ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) => {
    const newData: PerformanceData = {
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      count: 1,
    };

    setPerformanceData(prev => {
      const existing = prev.find(item => item.id === id);
      if (existing) {
        return prev.map(item => 
          item.id === id 
            ? { ...item, count: item.count + 1, actualDuration: Math.max(item.actualDuration, actualDuration) }
            : item
        );
      }
      return [...prev, newData];
    });

    // Log performance warnings in development
    if (process.env.NODE_ENV === 'development' && actualDuration > threshold) {
      console.warn(
        `🚨 Performance Warning: ${id} took ${actualDuration.toFixed(2)}ms to render (threshold: ${threshold}ms)`
      );
    }
  };

  // Log performance summary periodically
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        setPerformanceData(currentData => {
          if (currentData.length > 0) {
            const avgDuration = currentData.reduce((sum, item) => sum + item.actualDuration, 0) / currentData.length;
            const maxDuration = Math.max(...currentData.map(item => item.actualDuration));
            
            console.log(`📊 Performance Summary for ${id}:`, {
              components: currentData.length,
              avgDuration: avgDuration.toFixed(2) + 'ms',
              maxDuration: maxDuration.toFixed(2) + 'ms',
              totalRenders: currentData.reduce((sum, item) => sum + item.count, 0),
            });
          }
          return currentData; // Return the same data to avoid unnecessary re-renders
        });
      }, 10000); // Log every 10 seconds

      return () => clearInterval(interval);
    }
  }, [id]); // Remove performanceData from dependencies

  return (
    <Profiler id={id} onRender={handleProfilerRender}>
      {children}
    </Profiler>
  );
}

// Hook to measure custom performance metrics
export function usePerformanceMeasure(id: string) {
  const [measurements, setMeasurements] = useState<number[]>([]);

  const measure = (fn: () => void) => {
    const start = performance.now();
    fn();
    const end = performance.now();
    const duration = end - start;
    
    setMeasurements(prev => [...prev, duration]);
    
    if (process.env.NODE_ENV === 'development' && duration > 16) {
      console.warn(`⏱️ Slow operation in ${id}: ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  };

  const getAverage = () => {
    if (measurements.length === 0) return 0;
    return measurements.reduce((sum, m) => sum + m, 0) / measurements.length;
  };

  const getMax = () => {
    if (measurements.length === 0) return 0;
    return Math.max(...measurements);
  };

  return { measure, getAverage, getMax, measurements };
} 