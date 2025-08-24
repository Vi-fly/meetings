import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Building, Globe, Users } from "lucide-react";
import { memo } from "react";

interface Organization {
  id: string;
  name: string;
  domain: string | null;
  created_at: string | null;
  updated_at: string | null;
  contact_count?: number;
}

interface OrganizationCardOptimizedProps {
  organization: Organization;
  onEdit: (organization: Organization) => void;
}

const getStatusBadge = (contactCount: number) => {
  if (contactCount > 0) {
    return "bg-green-100 text-green-800";
  }
  return "bg-gray-100 text-gray-800";
};

const getStatusLabel = (contactCount: number) => {
  if (contactCount > 0) {
    return "Active";
  }
  return "Empty";
};

export const OrganizationCardOptimized = memo<OrganizationCardOptimizedProps>(
  ({ organization, onEdit }) => {
    const contactCount = organization.contact_count || 0;
    const createdDate = organization.created_at ? new Date(organization.created_at) : null;

    return (
      <Card className="card-gradient card-hover">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src="" />
                <AvatarFallback>
                  <Building className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{organization.name}</h3>
                  <Badge className={`${getStatusBadge(contactCount)} text-xs`}>
                    {getStatusLabel(contactCount)}
                  </Badge>
                  {organization.domain && (
                    <Badge variant="outline" className="text-xs">
                      Has Domain
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {organization.domain && (
                    <div className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      <span>{organization.domain}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{contactCount} contacts</span>
                  </div>
                  {createdDate && (
                    <div className="flex items-center gap-1">
                      <span>Created {format(createdDate, "MMM dd, yyyy")}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right text-sm">
                <div className="font-medium">Contacts</div>
                <div className="text-muted-foreground">
                  {contactCount}
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onEdit(organization)}
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
      prevProps.organization.id === nextProps.organization.id &&
      prevProps.organization.name === nextProps.organization.name &&
      prevProps.organization.domain === nextProps.organization.domain &&
      prevProps.organization.contact_count === nextProps.organization.contact_count &&
      prevProps.organization.created_at === nextProps.organization.created_at
    );
  }
);

OrganizationCardOptimized.displayName = "OrganizationCardOptimized"; 