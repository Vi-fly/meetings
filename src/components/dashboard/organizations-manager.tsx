import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebouncedLocalSearch } from "@/hooks/use-debounced-search";
import { useOrganizations } from "@/hooks/use-meetings";
import { Building, Filter, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { OrganizationAddDialog } from "./organization-add-dialog";
import { OrganizationCardOptimized } from "./organization-card-optimized";
import { OrganizationEditDialog } from "./organization-edit-dialog";


interface Organization {
  id: string;
  name: string;
  domain: string | null;
  created_at: string | null;
  updated_at: string | null;
  contact_count?: number;
}

interface OrganizationsManagerProps {
  open: boolean;
  onClose: () => void;
}

export function OrganizationsManager({ open, onClose }: OrganizationsManagerProps) {
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    hasDomain: "all",
    contactCount: "all",
  });
  
  const { data: organizations, isLoading } = useOrganizations();

  // Memoize organizations data to prevent unnecessary re-renders
  const memoizedOrganizations = useMemo(() => organizations || [], [organizations]);

  // Use debounced search for better performance
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    filteredData: filteredOrganizations,
    clearSearch,
  } = useDebouncedLocalSearch(memoizedOrganizations, ["name", "domain"], 300);

  const handleEditOrganization = (organization: Organization) => {
    setEditingOrganization(organization);
  };

  const handleCloseEdit = () => {
    setEditingOrganization(null);
  };

  const handleAddOrganization = () => {
    setShowAddDialog(true);
  };

  const handleCloseAdd = () => {
    setShowAddDialog(false);
  };

  const clearAllFilters = () => {
    setFilters({
      hasDomain: "all",
      contactCount: "all",
    });
  };

  const hasActiveFilters = filters.hasDomain !== "all" || 
                          filters.contactCount !== "all";

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              All Organizations
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Search and Filters */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search organizations by name or domain..."
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
                        {(filters.hasDomain !== "all" ? 1 : 0) + (filters.contactCount !== "all" ? 1 : 0)}
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
                        <Label className="text-xs text-muted-foreground">Domain Status</Label>
                        <Select
                          value={filters.hasDomain}
                          onValueChange={(value) => setFilters(prev => ({ ...prev, hasDomain: value }))}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Organizations</SelectItem>
                            <SelectItem value="with">With Domain</SelectItem>
                            <SelectItem value="without">Without Domain</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Contact Status</Label>
                        <Select
                          value={filters.contactCount}
                          onValueChange={(value) => setFilters(prev => ({ ...prev, contactCount: value }))}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Organizations</SelectItem>
                            <SelectItem value="active">With Contacts</SelectItem>
                            <SelectItem value="empty">No Contacts</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button size="sm" className="btn-gradient" onClick={handleAddOrganization}>
                <Plus className="h-4 w-4 mr-2" />
                Add Organization
              </Button>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Active filters:</span>
                {filters.hasDomain !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    {filters.hasDomain === "with" ? "With Domain" : "Without Domain"}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilters(prev => ({ ...prev, hasDomain: "all" }))}
                      className="h-auto p-0 ml-1 hover:bg-transparent"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {filters.contactCount !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    {filters.contactCount === "active" ? "With Contacts" : "No Contacts"}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilters(prev => ({ ...prev, contactCount: "all" }))}
                      className="h-auto p-0 ml-1 hover:bg-transparent"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
              </div>
            )}

            {/* Organizations List */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading organizations...
                </div>
              ) : filteredOrganizations.length > 0 ? (
                <>
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredOrganizations.length} of {organizations?.length || 0} organizations
                  </div>
                  {filteredOrganizations.map((org) => (
                    <OrganizationCardOptimized
                      key={org.id}
                      organization={org}
                      onEdit={() => handleEditOrganization(org)}
                    />
                  ))}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery || hasActiveFilters 
                    ? "No organizations found matching your search and filters." 
                    : "No organizations found. Add some organizations to get started."}
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
      </Dialog>

      <OrganizationEditDialog
        organization={editingOrganization}
        open={!!editingOrganization}
        onClose={handleCloseEdit}
      />

      <OrganizationAddDialog
        open={showAddDialog}
        onClose={handleCloseAdd}
      />
    </>
  );
} 