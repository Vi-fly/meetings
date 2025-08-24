import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebouncedLocalSearch } from "@/hooks/use-debounced-search";
import { useContactsPaginated, useOrganizations } from "@/hooks/use-meetings";
import { Filter, Plus, Search, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ContactAddDialog } from "./contact-add-dialog";
import { ContactCardOptimized } from "./contact-card-optimized";
import { ContactEditDialog } from "./contact-edit-dialog";


interface Contact {
  id: string;
  name: string;
  email: string;
  member_type: "internal" | "external";
  tags: any;
  status: "active" | "inactive" | null;
  organization_id?: string | null;
  organizations?: {
    name: string;
    domain: string | null;
  } | null;
}

interface ParticipantsManagerProps {
  open: boolean;
  onClose: () => void;
}

export function ParticipantsManager({ open, onClose }: ParticipantsManagerProps) {
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    memberType: "all",
    status: "all",
    organization: "all",
    selectedTags: [] as string[],
  });
  
  // Use paginated contacts for better performance
  const { data: paginatedData, isLoading } = useContactsPaginated(currentPage, 20);
  const contacts = paginatedData?.contacts || [];
  const totalCount = paginatedData?.totalCount || 0;
  const hasMore = paginatedData?.hasMore || false;

  // Use debounced search for better performance
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    filteredData: filteredContacts,
    clearSearch,
  } = useDebouncedLocalSearch(contacts, ["name", "email"], 300);

  // Get all unique tags from contacts
  const allTags = useMemo(() => {
    if (!contacts) return [];
    const tags = new Set<string>();
    contacts.forEach(contact => {
      if (contact.tags && Array.isArray(contact.tags)) {
        contact.tags.forEach((tag: any) => {
          if (typeof tag === 'string') tags.add(tag);
        });
      }
    });
    return Array.from(tags).sort();
  }, [contacts]);

  // Get all organizations from the organizations table
  const { data: organizations } = useOrganizations();
  const allOrganizations = useMemo(() => {
    if (!organizations) return [];
    return organizations.map(org => org.name).sort();
  }, [organizations]);

  const getContactTypeBadge = (memberType: string) => {
    const colors = {
      internal: "bg-primary text-primary-foreground",
      external: "bg-secondary text-secondary-foreground",
    };
    return colors[memberType as keyof typeof colors] || colors.external;
  };

  const getContactTags = (tags: any) => {
    if (!tags || !Array.isArray(tags)) return [];
    return tags.filter((tag: any) => typeof tag === 'string');
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
  };

  const handleCloseEdit = () => {
    setEditingContact(null);
  };

  const handleAddParticipant = () => {
    setShowAddDialog(true);
  };

  const handleCloseAdd = () => {
    setShowAddDialog(false);
  };

  const handleTagToggle = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter(t => t !== tag)
        : [...prev.selectedTags, tag]
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      memberType: "all",
      status: "all",
      organization: "all",
      selectedTags: [],
    });
  };

  const hasActiveFilters = filters.memberType !== "all" || 
                          filters.status !== "all" || 
                          filters.organization !== "all" ||
                          filters.selectedTags.length > 0;

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Participants
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Search and Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search participants by name or email..."
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
                        {filters.selectedTags.length + (filters.memberType !== "all" ? 1 : 0) + (filters.status !== "all" ? 1 : 0) + (filters.organization !== "all" ? 1 : 0)}
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
                        <Label className="text-xs text-muted-foreground">Member Type</Label>
                        <Select
                          value={filters.memberType}
                          onValueChange={(value) => setFilters(prev => ({ ...prev, memberType: value }))}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="internal">Internal</SelectItem>
                            <SelectItem value="external">External</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

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
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Organization</Label>
                        <Select
                          value={filters.organization}
                          onValueChange={(value) => setFilters(prev => ({ ...prev, organization: value }))}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Organizations</SelectItem>
                            {allOrganizations.map(org => (
                              <SelectItem key={org} value={org}>{org}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Tags</Label>
                        <ScrollArea className="h-32">
                          <div className="space-y-2">
                            {allTags.map((tag) => (
                              <div key={tag} className="flex items-center space-x-2">
                                <Checkbox
                                  id={tag}
                                  checked={filters.selectedTags.includes(tag)}
                                  onCheckedChange={() => handleTagToggle(tag)}
                                />
                                <Label htmlFor={tag} className="text-sm font-normal">
                                  {tag}
                                </Label>
                              </div>
                            ))}
                            {allTags.length === 0 && (
                              <p className="text-xs text-muted-foreground">No tags available</p>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button size="sm" className="btn-gradient" onClick={handleAddParticipant}>
              <Plus className="h-4 w-4 mr-2" />
              Add Participant
            </Button>
          </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Active filters:</span>
                {filters.memberType !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    {filters.memberType}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilters(prev => ({ ...prev, memberType: "all" }))}
                      className="h-auto p-0 ml-1 hover:bg-transparent"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {filters.status !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    {filters.status}
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
                {filters.organization !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    {filters.organization}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilters(prev => ({ ...prev, organization: "all" }))}
                      className="h-auto p-0 ml-1 hover:bg-transparent"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {filters.selectedTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTagToggle(tag)}
                      className="h-auto p-0 ml-1 hover:bg-transparent"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}

          {/* Participants List */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading participants...
              </div>
            ) : filteredContacts.length > 0 ? (
                  <>
                    <div className="text-sm text-muted-foreground">
                      Showing {filteredContacts.length} of {totalCount} participants
                    </div>
                    {filteredContacts.map((contact) => (
                      <ContactCardOptimized
                        key={contact.id}
                        contact={contact}
                        onEdit={() => handleEditContact(contact)}
                      />
                    ))}
                  </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                    {searchQuery || hasActiveFilters 
                      ? "No participants found matching your search and filters." 
                      : "No participants found. Add some participants to get started."}
                  </div>
                )}
              </div>
          </div>

          {/* Pagination Controls */}
          {filteredContacts.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {Math.ceil(totalCount / 20)}
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
          )}

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>

      <ContactEditDialog
        contact={editingContact}
        open={!!editingContact}
        onClose={handleCloseEdit}
      />

      <ContactAddDialog
        open={showAddDialog}
        onClose={handleCloseAdd}
      />
    </>
  );
}