import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  FileText,
  Trash2,
  ExternalLink,
  Loader2,
  Edit,
  Upload,
  CheckCircle,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface ArticleDraft {
  id: string;
  source_url: string;
  source_title: string;
  source_image: string | null;
  source_name: string | null;
  hebrew_title: string;
  hebrew_content: string;
  english_title: string;
  english_content: string;
  status: string;
  wordpress_hebrew_url: string | null;
  wordpress_english_url: string | null;
  created_at: string;
  updated_at: string;
}

const statusConfig = {
  draft: { label: "טיוטה", variant: "secondary" as const, icon: Clock },
  published_hebrew: { label: "עברית פורסם", variant: "default" as const, icon: CheckCircle },
  published_english: { label: "אנגלית פורסם", variant: "default" as const, icon: CheckCircle },
  published_both: { label: "שניהם פורסמו", variant: "tactical" as const, icon: CheckCircle },
};

export default function Drafts() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<ArticleDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("article_drafts")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setDrafts((data as ArticleDraft[]) || []);
    } catch (error) {
      console.error("Error fetching drafts:", error);
      toast.error("שגיאה בטעינת הטיוטות");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("article_drafts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setDrafts(drafts.filter((d) => d.id !== id));
      toast.success("הטיוטה נמחקה");
    } catch (error) {
      console.error("Error deleting draft:", error);
      toast.error("שגיאה במחיקת הטיוטה");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (draft: ArticleDraft) => {
    // Navigate to generator with draft ID for editing
    navigate(`/generate?draft=${draft.id}`);
  };

  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  return (
    <Layout>
      <div className="p-3 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            <div>
              <h1 className="font-mono text-lg md:text-xl font-bold">טיוטות</h1>
              <p className="font-mono text-[10px] md:text-xs text-muted-foreground">
                כתבות לפני פרסום לוורדפרס
              </p>
            </div>
          </div>
          <Badge variant="outline" className="font-mono">
            {drafts.length} טיוטות
          </Badge>
        </div>

        {/* Drafts Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-mono text-sm">רשימת טיוטות</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : drafts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-mono text-sm">אין טיוטות</p>
                <p className="text-xs mt-1">צור כתבה חדשה מהדיג'סט היומי</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>כותרת</TableHead>
                      <TableHead className="text-center">מילים</TableHead>
                      <TableHead className="text-center">סטטוס</TableHead>
                      <TableHead className="text-center">עודכן</TableHead>
                      <TableHead className="text-right">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drafts.map((draft) => {
                      const status = statusConfig[draft.status as keyof typeof statusConfig] || statusConfig.draft;
                      const StatusIcon = status.icon;
                      const hebrewWords = countWords(draft.hebrew_content);
                      const englishWords = countWords(draft.english_content);
                      
                      return (
                        <TableRow key={draft.id}>
                          <TableCell>
                            {draft.source_image && (
                              <img
                                src={draft.source_image}
                                alt=""
                                className="w-10 h-10 object-cover rounded"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-sm line-clamp-1" dir="rtl">
                                {draft.hebrew_title}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {draft.english_title}
                              </p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">
                                  {draft.source_name}
                                </Badge>
                                <a
                                  href={draft.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="space-y-1">
                              <Badge 
                                variant={hebrewWords >= 300 && hebrewWords <= 500 ? "tactical" : "secondary"}
                                className="text-[10px]"
                              >
                                עב: {hebrewWords}
                              </Badge>
                              <br />
                              <Badge 
                                variant={englishWords >= 300 && englishWords <= 500 ? "tactical" : "secondary"}
                                className="text-[10px]"
                              >
                                EN: {englishWords}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={status.variant} className="gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {format(new Date(draft.updated_at), "dd/MM HH:mm", { locale: he })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(draft)}
                                title="ערוך"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              {draft.wordpress_hebrew_url && (
                                <a
                                  href={draft.wordpress_hebrew_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button variant="ghost" size="icon" title="פתח בוורדפרס (עברית)">
                                    <Upload className="h-4 w-4 text-primary" />
                                  </Button>
                                </a>
                              )}
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={deletingId === draft.id}
                                    title="מחק"
                                  >
                                    {deletingId === draft.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>מחיקת טיוטה</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      האם אתה בטוח שברצונך למחוק את הטיוטה "{draft.hebrew_title}"?
                                      פעולה זו לא ניתנת לביטול.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>ביטול</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(draft.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      מחק
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
