import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useContacts } from "@/hooks/use-meetings";
import { cn } from "@/lib/utils";
import { ChevronDown, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";

interface Contact {
  id: string;
  name: string;
  email: string;
  member_type: "internal" | "external";
  tags: any; // Changed from string[] | null to any to handle Json type
  status: "active" | "inactive" | null;
}

interface ContactSelectorProps {
  selectedContacts: Contact[];
  onContactsChange: (contacts: Contact[]) => void;
}

export function ContactSelector({ selectedContacts, onContactsChange }: ContactSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [memberTypeFilter, setMemberTypeFilter] = useState<"all" | "internal" | "external">("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  
  const { data: contacts, isLoading } = useContacts();

  // Get all unique tags from contacts
  const allTags = useMemo(() => {
    if (!contacts) return [];
    const tags = new Set<string>();
    contacts.forEach(contact => {
      if (contact.tags && Array.isArray(contact.tags)) {
        contact.tags.forEach((tag: string) => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [contacts]);

  // Filter contacts based on search, member type, and tags
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    
    return contacts.filter(contact => {
      const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           contact.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesMemberType = memberTypeFilter === "all" || contact.member_type === memberTypeFilter;
      
      const matchesTag = tagFilter === "all" || 
                        (contact.tags && Array.isArray(contact.tags) && contact.tags.includes(tagFilter));
      
      return matchesSearch && matchesMemberType && matchesTag;
    });
  }, [contacts, searchTerm, memberTypeFilter, tagFilter]);

  const handleContactToggle = (contact: Contact) => {
    const isSelected = selectedContacts.some(c => c.id === contact.id);
    
    if (isSelected) {
      onContactsChange(selectedContacts.filter(c => c.id !== contact.id));
    } else {
      onContactsChange([...selectedContacts, contact]);
    }
  };

  const handleSelectAll = () => {
    onContactsChange(filteredContacts);
  };

  const handleClearAll = () => {
    onContactsChange([]);
  };

  const getSelectedEmails = () => {
    return selectedContacts.map(c => c.email).join(", ");
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="attendees" className="flex items-center gap-2">
        <Users className="h-4 w-4" />
        Attendees
      </Label>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full justify-between"
          >
            <span className="truncate">
              {selectedContacts.length === 0 
                ? "Select attendees from contacts..." 
                : `${selectedContacts.length} attendee(s) selected`}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="p-4 border-b">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Member Type</Label>
                  <select
                    value={memberTypeFilter}
                    onChange={(e) => setMemberTypeFilter(e.target.value as any)}
                    className="w-full text-sm border rounded-md p-2 mt-1"
                  >
                    <option value="all">All</option>
                    <option value="internal">Internal</option>
                    <option value="external">External</option>
                  </select>
                </div>
                
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Tag</Label>
                  <select
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    className="w-full text-sm border rounded-md p-2 mt-1"
                  >
                    <option value="all">All Tags</option>
                    {allTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="flex-1"
                >
                  Select All ({filteredContacts.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  className="flex-1"
                >
                  Clear All
                </Button>
              </div>
            </div>
          </div>
          
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                Loading contacts...
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No contacts found
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredContacts.map((contact) => {
                  const isSelected = selectedContacts.some(c => c.id === contact.id);
                  
                  return (
                    <div
                      key={contact.id}
                      className={cn(
                        "flex items-center space-x-3 p-2 rounded-md cursor-pointer hover:bg-muted transition-colors",
                        isSelected && "bg-muted"
                      )}
                      onClick={() => handleContactToggle(contact)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleContactToggle(contact)}
                        className="flex-shrink-0"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{contact.name}</span>
                          <Badge 
                            variant={contact.member_type === "internal" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {contact.member_type}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {contact.email}
                        </div>
                        {contact.tags && Array.isArray(contact.tags) && contact.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {contact.tags.slice(0, 2).map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {contact.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{contact.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
      
      {selectedContacts.length > 0 && (
        <div className="mt-2">
          <Label className="text-xs text-muted-foreground">Selected Attendees:</Label>
          <div className="mt-1 p-2 bg-muted rounded-md">
            <div className="text-sm text-muted-foreground">
              {getSelectedEmails()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 