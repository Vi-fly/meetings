import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useContacts, useOrganizations } from "@/hooks/use-meetings";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

interface ContactAddDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ContactAddDialog({ open, onClose }: ContactAddDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: contacts } = useContacts();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
        .insert({
          name: formData.name,
          email: formData.email,
          member_type: formData.member_type,
          status: formData.status,
          organization_id: organization_id,
          tags: finalTags,
        });

      if (error) throw error;

      toast({
        title: "Contact Added",
        description: "New contact has been added successfully.",
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        member_type: "external",
        status: "active",
        organization: "none",
        tags: "",
      });

      // Invalidate contacts query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      onClose();
    } catch (error) {
      console.error("Error adding contact:", error);
      toast({
        title: "Error",
        description: "Failed to add contact. Please try again.",
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

  const handleClose = () => {
    // Reset form when closing
    setFormData({
      name: "",
      email: "",
      member_type: "external",
      status: "active",
      organization: "none",
      tags: "",
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
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
            <Label htmlFor="organization">Organization (Optional)</Label>
            <Select
              value={formData.organization}
              onValueChange={(value) => handleInputChange("organization", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an organization or leave blank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {allOrganizations.map(org => (
                  <SelectItem key={org} value={org}>{org}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select an existing organization or leave blank for no organization
            </p>
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
              onClick={handleClose}
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
              {isLoading ? "Adding..." : "Add Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 