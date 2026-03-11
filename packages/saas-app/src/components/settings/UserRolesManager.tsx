import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, Loader2, Shield, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  created_at: string;
}

const emailSchema = z.string().email("Please enter a valid email address").max(255);

export function UserRolesManager() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAdmins = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError("Not authenticated");
        return;
      }

      const response = await supabase.functions.invoke('manage-user-roles', {
        body: { action: 'list' },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        setAdmins(response.data.data || []);
      } else {
        throw new Error(response.data?.error || 'Failed to fetch admins');
      }
    } catch (err) {
      console.error('Error fetching admins:', err);
      setError(err instanceof Error ? err.message : 'Failed to load admins');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAddAdmin = async () => {
    // Validate email
    const validation = emailSchema.safeParse(newEmail.trim());
    if (!validation.success) {
      toast.error("Invalid email", { description: validation.error.errors[0].message });
      return;
    }

    try {
      setIsAdding(true);
      
      const response = await supabase.functions.invoke('manage-user-roles', {
        body: { action: 'add', email: newEmail.trim() },
      });

      if (response.data?.success) {
        toast.success("Admin added", { description: `${newEmail} is now an admin` });
        setNewEmail("");
        fetchAdmins();
      } else {
        const errorMsg = response.data?.error || response.error?.message || 'Failed to add admin';
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error('Error adding admin:', err);
      toast.error("Failed to add admin", { 
        description: err instanceof Error ? err.message : 'Unknown error' 
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveAdmin = async (userId: string, email: string) => {
    try {
      setRemovingId(userId);
      
      const response = await supabase.functions.invoke('manage-user-roles', {
        body: { action: 'remove', user_id: userId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        toast.success("Admin removed", { description: `${email} is no longer an admin` });
        fetchAdmins();
      } else {
        throw new Error(response.data?.error || 'Failed to remove admin');
      }
    } catch (err) {
      console.error('Error removing admin:', err);
      toast.error("Failed to remove admin", { 
        description: err instanceof Error ? err.message : 'Unknown error' 
      });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="font-mono text-sm font-medium">Admin Users</span>
        </div>
        <Badge variant="tactical">
          {admins.length} {admins.length === 1 ? 'ADMIN' : 'ADMINS'}
        </Badge>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Add new admin */}
        <div className="flex gap-2">
          <Input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 font-mono text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newEmail.trim()) {
                handleAddAdmin();
              }
            }}
          />
          <Button
            variant="tactical"
            size="sm"
            onClick={handleAddAdmin}
            disabled={!newEmail.trim() || isAdding}
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add Admin
              </>
            )}
          </Button>
        </div>

        <p className="font-mono text-xs text-muted-foreground">
          Enter the email of a registered user to grant them admin access
        </p>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-3">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="font-mono text-xs text-destructive">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {/* Admin list */}
        {!isLoading && !error && (
          <div className="space-y-2">
            {admins.length === 0 ? (
              <p className="font-mono text-xs text-muted-foreground text-center py-4">
                No admins configured
              </p>
            ) : (
              admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-mono text-sm">{admin.email}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        Added {new Date(admin.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={removingId === admin.user_id}
                      >
                        {removingId === admin.user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Admin Access</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove admin access for {admin.email}? 
                          They will no longer be able to access the dashboard.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveAdmin(admin.user_id, admin.email)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}