import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface OrganizationAddDialogProps {
  open: boolean;
  onClose: () => void;
}

export function OrganizationAddDialog({ open, onClose }: OrganizationAddDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    domain: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .insert({
          name: formData.name.trim(),
          domain: formData.domain.trim() || null,
        });

      if (error) throw error;

      toast({
        title: "Organization Added",
        description: "New organization has been added successfully.",
      });

      // Reset form
      setFormData({
        name: "",
        domain: "",
      });

      // Invalidate organizations query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      onClose();
    } catch (error) {
      console.error("Error adding organization:", error);
      toast({
        title: "Error",
        description: "Failed to add organization. Please try again.",
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
      domain: "",
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Organization</DialogTitle>
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
              {isLoading ? "Adding..." : "Add Organization"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 