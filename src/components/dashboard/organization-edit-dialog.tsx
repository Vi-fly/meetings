import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

interface Organization {
  id: string;
  name: string;
  domain: string | null;
  created_at: string | null;
  updated_at: string | null;
  contact_count?: number;
}

interface OrganizationEditDialogProps {
  organization: Organization | null;
  open: boolean;
  onClose: () => void;
}

export function OrganizationEditDialog({ organization, open, onClose }: OrganizationEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    domain: "",
  });

  // Update form data when organization changes
  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name,
        domain: organization.domain || "",
      });
    }
  }, [organization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          name: formData.name.trim(),
          domain: formData.domain.trim() || null,
        })
        .eq("id", organization.id);

      if (error) throw error;

      toast({
        title: "Organization Updated",
        description: "Organization information has been updated successfully.",
      });

      // Invalidate organizations query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      onClose();
    } catch (error) {
      console.error("Error updating organization:", error);
      toast({
        title: "Error",
        description: "Failed to update organization. Please try again.",
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
          <DialogTitle>Edit Organization</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
              placeholder="Enter organization name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">Domain (Optional)</Label>
            <Input
              id="domain"
              value={formData.domain}
              onChange={(e) => handleInputChange("domain", e.target.value)}
              placeholder="e.g., company.com"
            />
            <p className="text-xs text-muted-foreground">
              Enter the organization's domain (optional)
            </p>
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
              {isLoading ? "Updating..." : "Update Organization"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 