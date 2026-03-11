import { useState, useEffect } from "react";
import { Mail, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EmailRecipient {
  id: string;
  email: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
}

export function EmailRecipientsManager() {
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const fetchRecipients = async () => {
    const { data, error } = await supabase.functions.invoke('manage-recipients', {
      body: { action: 'list' }
    });

    if (error || !data?.success) {
      console.error("Error fetching recipients:", error || data?.error);
      toast.error("שגיאה בטעינת נמענים");
    } else {
      setRecipients(data.data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRecipients();
  }, []);

  const handleAdd = async () => {
    if (!newEmail.trim()) {
      toast.error("יש להזין כתובת מייל");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast.error("כתובת מייל לא תקינה");
      return;
    }

    setIsAdding(true);
    const { data, error } = await supabase.functions.invoke('manage-recipients', {
      body: { 
        action: 'add',
        email: newEmail.trim(),
        name: newName.trim() || null,
      }
    });

    if (error || !data?.success) {
      console.error("Error adding recipient:", error || data?.error);
      toast.error("שגיאה בהוספת נמען");
    } else {
      setRecipients((prev) => [data.data, ...prev]);
      setNewEmail("");
      setNewName("");
      toast.success("נמען נוסף בהצלחה");
    }
    setIsAdding(false);
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    const { data, error } = await supabase.functions.invoke('manage-recipients', {
      body: { 
        action: 'toggle',
        id,
        is_active: !isActive,
      }
    });

    if (error || !data?.success) {
      console.error("Error toggling recipient:", error || data?.error);
      toast.error("שגיאה בעדכון נמען");
    } else {
      setRecipients((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_active: !isActive } : r))
      );
    }
  };

  const handleDelete = async (id: string) => {
    const { data, error } = await supabase.functions.invoke('manage-recipients', {
      body: { 
        action: 'delete',
        id,
      }
    });

    if (error || !data?.success) {
      console.error("Error deleting recipient:", error || data?.error);
      toast.error("שגיאה במחיקת נמען");
    } else {
      setRecipients((prev) => prev.filter((r) => r.id !== id));
      toast.success("נמען נמחק");
    }
  };

  const activeCount = recipients.filter((r) => r.is_active).length;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 md:px-4 py-2 md:py-3">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <span className="font-mono text-xs md:text-sm font-medium">נמעני מייל</span>
        </div>
        <Badge variant="tactical" className="text-[10px] md:text-xs">
          {activeCount} פעילים
        </Badge>
      </div>

      <div className="p-3 md:p-4 space-y-4">
        {/* Add New Recipient */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex gap-2">
            <Input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="כתובת מייל"
              type="email"
              className="flex-1 text-sm"
              dir="ltr"
            />
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="שם (אופציונלי)"
              className="w-28 md:w-32 text-sm"
            />
          </div>
          <Button
            variant="tactical"
            size="sm"
            onClick={handleAdd}
            disabled={isAdding || !newEmail.trim()}
            className="w-full sm:w-auto"
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4" />
                הוסף
              </>
            )}
          </Button>
        </div>

        {/* Recipients List */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : recipients.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="font-mono text-xs">אין נמענים עדיין</p>
            </div>
          ) : (
            recipients.map((recipient) => (
              <div
                key={recipient.id}
                className={`flex items-center gap-2 md:gap-3 rounded-md p-2 md:p-3 transition-colors ${
                  recipient.is_active ? "bg-surface" : "bg-muted/30"
                }`}
              >
                <Switch
                  checked={recipient.is_active}
                  onCheckedChange={() => handleToggle(recipient.id, recipient.is_active)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {recipient.name && (
                      <span className="font-medium text-xs md:text-sm truncate">
                        {recipient.name}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[10px] md:text-xs text-muted-foreground truncate" dir="ltr">
                    {recipient.email}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 md:h-8 md:w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(recipient.id)}
                >
                  <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}