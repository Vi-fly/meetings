import { Database } from "@/integrations/supabase/types";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { MeetingCardOptimized } from "./meeting-card-optimized";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"] & {
  meeting_attendees?: Database["public"]["Tables"]["meeting_attendees"]["Row"];
  meeting_minutes?: Database["public"]["Tables"]["meeting_minutes"]["Row"];
};

interface VirtualizedMeetingsListProps {
  meetings: Meeting[];
  onEdit: (meeting: Meeting) => void;
  height?: number;
}

export function VirtualizedMeetingsList({ 
  meetings, 
  onEdit, 
  height = 600 
}: VirtualizedMeetingsListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: meetings.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated height of each meeting card
    overscan: 5, // Number of items to render outside the viewport
  });

  return (
    <div
      ref={parentRef}
      className="overflow-auto"
      style={{ height }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const meeting = meetings[virtualRow.index];
          return (
            <div
              key={virtualRow.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="mb-3"
            >
              <MeetingCardOptimized
                meeting={meeting}
                onEdit={onEdit}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
} 