import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useOrganizations } from "@/hooks/use-meetings";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

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

interface ContactEditDialogProps {
  contact: Contact | null;
  open: boolean;
  onClose: () => void;
}

export function ContactEditDialog({ contact, open, onClose }: ContactEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: organizations } = useOrganizations();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    member_type: "external" as "internal" | "external",
    status: "active" as "active" | "inactive",
    organization: "none",
    tags: "",
  });

  // Get all organizations from the organizations table
  const allOrganizations = useMemo(() => {
    if (!organizations) return [];
    return organizations.map(org => org.name).sort();
  }, [organizations]);

  // Update form data when contact changes
  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name,
        email: contact.email,
        member_type: contact.member_type,
        status: contact.status || "active",
        organization: contact.organizations?.name || "none",
        tags: contact.tags ? (Array.isArray(contact.tags) ? contact.tags.join(", ") : "") : "",
      });
    }
  }, [contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact) return;

    setIsLoading(true);
    try {
      // Parse tags
      const tags = formData.tags
        .split(",")
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Add organization to tags if provided
      const finalTags = [...tags];
      if (formData.organization && formData.organization !== "none" && formData.organization.trim() !== "") {
        finalTags.push(`org:${formData.organization.trim()}`);
      }

      // Try to find or create organization
      let organization_id = null;
      if (formData.organization && formData.organization !== "none" && formData.organization.trim() !== "") {
        try {
          // First try to find existing organization
          const { data: existingOrg } = await supabase
            .from("organizations")
            .select("id")
            .eq("name", formData.organization.trim())
            .single();
          
          if (existingOrg) {
            organization_id = existingOrg.id;
          } else {
            // Create new organization if it doesn't exist
            const { data: newOrg, error: createError } = await supabase
              .from("organizations")
              .insert({
                name: formData.organization.trim(),
                domain: null,
              })
              .select("id")
              .single();
            
            if (!createError && newOrg) {
              organization_id = newOrg.id;
            }
          }
        } catch (error) {
          console.warn("Error handling organization, proceeding without organization link:", error);
        }
      }

      const { error } = await supabase
        .from("contacts")
        .update({
          name: formData.name,
          email: formData.email,
          member_type: formData.member_type,
          status: formData.status,
          organization_id: organization_id,
          tags: finalTags,
        })
        .eq("id", contact.id);

      if (error) throw error;

      toast({
        title: "Contact Updated",
        description: "Contact information has been updated successfully.",
      });

      // Invalidate contacts query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      onClose();
    } catch (error) {
      console.error("Error updating contact:", error);
      toast({
        title: "Error",
        description: "Failed to update contact. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
              placeholder="Enter full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              required
              placeholder="Enter email address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="member_type">Member Type</Label>
            <Select
              value={formData.member_type}
              onValueChange={(value) => handleInputChange("member_type", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="external">External</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization">Organization</Label>
            <Select
              value={formData.organization}
              onValueChange={(value) => handleInputChange("organization", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an organization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {allOrganizations.map(org => (
                  <SelectItem key={org} value={org}>{org}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Textarea
              id="tags"
              value={formData.tags}
              onChange={(e) => handleInputChange("tags", e.target.value)}
              placeholder="Enter tags separated by commas (e.g., developer, manager, client)"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? "Updating..." : "Update Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 