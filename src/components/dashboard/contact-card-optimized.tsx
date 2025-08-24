import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building, Mail } from "lucide-react";
import { memo } from "react";

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

interface ContactCardOptimizedProps {
  contact: Contact;
  onEdit: (contact: Contact) => void;
}

const getContactTypeBadge = (memberType: string) => {
  const colors = {
    internal: "bg-blue-100 text-blue-800",
    external: "bg-orange-100 text-orange-800",
  };
  return colors[memberType as keyof typeof colors] || colors.external;
};

const getStatusBadge = (status: string | null) => {
  const colors = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
  };
  return colors[status as keyof typeof colors] || colors.active;
};

const getContactTags = (tags: any) => {
  if (!tags || !Array.isArray(tags)) return [];
  return tags.filter((tag: any) => typeof tag === 'string').slice(0, 3);
};

export const ContactCardOptimized = memo<ContactCardOptimizedProps>(
  ({ contact, onEdit }) => {
    const tags = getContactTags(contact.tags);

    return (
      <Card className="card-gradient card-hover">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src="" />
                <AvatarFallback>
                  {contact.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{contact.name}</h3>
                  <Badge className={`${getContactTypeBadge(contact.member_type)} text-xs`}>
                    {contact.member_type}
                  </Badge>
                  <Badge className={`${getStatusBadge(contact.status)} text-xs`}>
                    {contact.status || 'active'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <span>{contact.email}</span>
                  </div>
                  {contact.organizations?.name && (
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      <span>{contact.organizations.name}</span>
                    </div>
                  )}
                </div>

                {tags.length > 0 && (
                  <div className="flex items-center gap-1">
                    {tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {contact.tags && Array.isArray(contact.tags) && contact.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{contact.tags.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right text-sm">
                <div className="font-medium">Status</div>
                <div className="text-muted-foreground">
                  {contact.status || 'active'}
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onEdit(contact)}
              >
                Edit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.contact.id === nextProps.contact.id &&
      prevProps.contact.name === nextProps.contact.name &&
      prevProps.contact.email === nextProps.contact.email &&
      prevProps.contact.member_type === nextProps.contact.member_type &&
      prevProps.contact.status === nextProps.contact.status &&
      JSON.stringify(prevProps.contact.tags) === JSON.stringify(nextProps.contact.tags) &&
      prevProps.contact.organizations?.name === nextProps.contact.organizations?.name
    );
  }
);

ContactCardOptimized.displayName = "ContactCardOptimized"; 