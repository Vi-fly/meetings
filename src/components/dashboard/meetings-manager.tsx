import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebouncedLocalSearch } from "@/hooks/use-debounced-search";
import { useMeetingsPaginated } from "@/hooks/use-meetings";
import { Database } from "@/integrations/supabase/types";
import { Calendar, Filter, Search, X } from "lucide-react";
import { useState } from "react";
import { MeetingCardOptimized } from "./meeting-card-optimized";
import { MeetingDetailsDialog } from "./meeting-details-dialog";
import { MeetingEditDialog } from "./meeting-edit-dialog";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"] & {
  meeting_attendees?: Database["public"]["Tables"]["meeting_attendees"]["Row"];
  meeting_minutes?: Database["public"]["Tables"]["meeting_minutes"]["Row"];
};

interface MeetingsManagerProps {
  open: boolean;
  onClose: () => void;
}

export function MeetingsManager({ open, onClose }: MeetingsManagerProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    hasMinutes: "all",
    duration: "all",
  });
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showMeetingDetails, setShowMeetingDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  const { data: paginatedData, isLoading } = useMeetingsPaginated(currentPage, 10);
  const meetings = paginatedData?.meetings || [];
  const totalCount = paginatedData?.totalCount || 0;
  const hasMore = paginatedData?.hasMore || false;

  // Use debounced search for better performance
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    filteredData: filteredMeetings,
    clearSearch,
  } = useDebouncedLocalSearch(meetings, ["title", "description"], 300);

  const handleEditMeeting = (meeting: Meeting) => {
    setEditingMeeting(meeting);
  };

  const handleCloseEdit = () => {
    setEditingMeeting(null);
  };

  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setShowMeetingDetails(true);
  };

  const handleCloseMeetingDetails = () => {
    setShowMeetingDetails(false);
    setSelectedMeeting(null);
  };

  const clearAllFilters = () => {
    setFilters({
      status: "all",
      hasMinutes: "all",
      duration: "all",
    });
  };

  const hasActiveFilters = filters.status !== "all" || 
                          filters.hasMinutes !== "all" || 
                          filters.duration !== "all";

  const getStatusBadge = (status: string) => {
    const colors = {
      upcoming: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
    };
    return colors[status as keyof typeof colors] || colors.completed;
  };

  const getDurationLabel = (duration: number) => {
    if (duration <= 30) return "Short";
    if (duration <= 60) return "Medium";
    return "Long";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            All Meetings
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Search and Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search meetings by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                      {(filters.status !== "all" ? 1 : 0) + (filters.hasMinutes !== "all" ? 1 : 0) + (filters.duration !== "all" ? 1 : 0)}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Filters</Label>
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFilters}
                        className="h-auto p-1 text-xs"
                      >
                        Clear all
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <Select
                        value={filters.status}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Meetings</SelectItem>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Minutes</Label>
                      <Select
                        value={filters.hasMinutes}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, hasMinutes: value }))}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Meetings</SelectItem>
                          <SelectItem value="with">With Minutes</SelectItem>
                          <SelectItem value="without">Without Minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Duration</Label>
                      <Select
                        value={filters.duration}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, duration: value }))}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Durations</SelectItem>
                          <SelectItem value="short">Short (≤30 min)</SelectItem>
                          <SelectItem value="medium">Medium (31-60 min)</SelectItem>
                          <SelectItem value="long">Long (&gt;60 min)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Active filters:</span>
              {filters.status !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  {filters.status === "upcoming" ? "Upcoming" : "Completed"}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, status: "all" }))}
                    className="h-auto p-0 ml-1 hover:bg-transparent"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {filters.hasMinutes !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  {filters.hasMinutes === "with" ? "With Minutes" : "Without Minutes"}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, hasMinutes: "all" }))}
                    className="h-auto p-0 ml-1 hover:bg-transparent"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {filters.duration !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  {filters.duration === "short" ? "Short" : filters.duration === "medium" ? "Medium" : "Long"}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, duration: "all" }))}
                    className="h-auto p-0 ml-1 hover:bg-transparent"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
          )}

          {/* Meetings List */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading meetings...
              </div>
            ) : filteredMeetings.length > 0 ? (
              <>
                <div className="text-sm text-muted-foreground">
                  Showing {filteredMeetings.length} of {totalCount} meetings
                </div>
                {filteredMeetings.map((meeting) => {
                  const scheduledDate = new Date(meeting.scheduled_at);
                  const now = new Date();
                  const status = scheduledDate > now ? "upcoming" : "completed";
                  const attendees = meeting.meeting_attendees?.attendees as any[] || [];
                  const hasMinutes = !!meeting.meeting_minutes;

                  return (
                    <MeetingCardOptimized
                      key={meeting.id}
                      meeting={meeting}
                      onEdit={handleEditMeeting}
                      onClick={handleMeetingClick}
                    />
                  );
                })}
                
                {/* Pagination Controls */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {Math.ceil(totalCount / 10)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={!hasMore}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery || hasActiveFilters 
                  ? "No meetings found matching your search and filters." 
                  : "No meetings found. Create your first meeting!"}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>

      <MeetingEditDialog
        meeting={editingMeeting}
        open={!!editingMeeting}
        onClose={handleCloseEdit}
      />

      <MeetingDetailsDialog
        meeting={selectedMeeting}
        open={showMeetingDetails}
        onClose={handleCloseMeetingDetails}
      />
    </Dialog>
  );
} 