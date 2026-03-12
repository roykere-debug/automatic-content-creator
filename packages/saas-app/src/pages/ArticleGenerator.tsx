import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { ArticleEditor } from "@/components/dashboard/ArticleEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, ExternalLink, ArrowLeft, FileText, RefreshCw, AlertTriangle, MessageSquare } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ArticleVersion {
  title: string;
  content: string;
  keywords: string[];
  metaDescription: string;
  categories?: string[];
}

interface BilingualArticle {
  hebrew: ArticleVersion;
  english: ArticleVersion;
  suggestedCategories?: string[];
}

export default function ArticleGenerator() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [generatedArticles, setGeneratedArticles] = useState<BilingualArticle | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState<'hebrew' | 'english'>('hebrew');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    exists: boolean;
    posts: Array<{ id: number; title: string; status: string; link: string; date: string }>;
  } | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [correctionNotes, setCorrectionNotes] = useState("");
  // Get article info from URL params
  const draftIdParam = searchParams.get("draft");
  const articleUrlParam = searchParams.get("url") || "";
  const articleTitleParam = searchParams.get("title") || "";
  const articleImageParam = searchParams.get("image") || "";
  const articleSourceParam = searchParams.get("source") || "";

  // State for source article info (can come from params or loaded draft)
  const [articleUrl, setArticleUrl] = useState(articleUrlParam);
  const [articleTitle, setArticleTitle] = useState(articleTitleParam);
  const [articleImage, setArticleImage] = useState(articleImageParam);
  const [articleSource, setArticleSource] = useState(articleSourceParam);
  const [unsplashPhotoUrl, setUnsplashPhotoUrl] = useState("");
  const [photographerName, setPhotographerName] = useState("");

  // Check for duplicate when URL is set
  useEffect(() => {
    if (articleUrl && !draftIdParam) {
      checkDuplicateInWordPress(articleUrl);
    }
  }, [articleUrl]);

  // Load draft if draft ID is provided
  useEffect(() => {
    if (draftIdParam) {
      loadDraft(draftIdParam);
    }
  }, [draftIdParam]);

  const checkDuplicateInWordPress = async (url: string) => {
    setIsCheckingDuplicate(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-wordpress-posts", {
        body: { action: "check_url", url },
      });

      if (error) {
        console.error("Duplicate check error:", error);
        return;
      }

      if (data?.exists) {
        setDuplicateWarning(data);
      } else {
        setDuplicateWarning(null);
      }
    } catch (error) {
      console.error("Duplicate check error:", error);
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  const loadDraft = async (id: string) => {
    setIsLoadingDraft(true);
    try {
      const { data, error } = await supabase
        .from("article_drafts")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast.error("הטיוטה לא נמצאה");
        navigate("/drafts");
        return;
      }

      // Set draft ID for updates
      setDraftId(data.id);

      // Set source article info
      setArticleUrl(data.source_url);
      setArticleTitle(data.source_title);
      const sourceImage = data.source_image || "";
      setArticleImage(sourceImage);
      setArticleSource(data.source_name || "");

      // Load Unsplash photo URL from draft
      if ((data as any).unsplash_photo_url) {
        setUnsplashPhotoUrl((data as any).unsplash_photo_url);
      }

      // Set generated articles from draft
      setGeneratedArticles({
        hebrew: {
          title: data.hebrew_title,
          content: data.hebrew_content,
          keywords: data.hebrew_keywords || [],
          metaDescription: data.hebrew_meta_description || "",
        },
        english: {
          title: data.english_title,
          content: data.english_content,
          keywords: data.english_keywords || [],
          metaDescription: data.english_meta_description || "",
        },
      });

      toast.success("הטיוטה נטענה");
    } catch (error) {
      console.error("Load draft error:", error);
      toast.error("שגיאה בטעינת הטיוטה");
    } finally {
      setIsLoadingDraft(false);
    }
  };

  const handleGenerate = async () => {
    if (!articleUrl || !articleTitle) {
      toast.error("חסרים פרטי הכתבה");
      return;
    }

    setIsGenerating(true);
    try {
      const body: any = {
        url: articleUrl,
        title: articleTitle,
        source: articleSource,
      };
      
      // If there are correction notes, include them and the current article for context
      if (correctionNotes.trim() && generatedArticles) {
        body.correctionNotes = correctionNotes.trim();
        body.previousPrimary = {
          title: generatedArticles.hebrew.title,
          content: generatedArticles.hebrew.content,
        };
        body.previousSecondary = {
          title: generatedArticles.english.title,
          content: generatedArticles.english.content,
        };
      }

      const { data, error } = await supabase.functions.invoke("generate-article", {
        body,
      });

      if (error) throw error;

      // Map primary/secondary (API response) → hebrew/english (component state)
      const categories = data.suggestedCategories || [];
      const articlesWithCategories = {
        hebrew: { ...(data.primary || data.hebrew || {}), categories },
        english: { ...(data.secondary || data.english || {}), categories },
        suggestedCategories: categories,
      };

      setGeneratedArticles(articlesWithCategories);
      
      if (data.suggestedCategories?.length > 0) {
        toast.success(`הכתבות נוצרו עם ${data.suggestedCategories.length} קטגוריות מוצעות!`);
      } else {
        toast.success("הכתבות נוצרו בהצלחה!");
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("שגיאה ביצירת הכתבה");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateArticle = (lang: 'hebrew' | 'english', updates: Partial<ArticleVersion>) => {
    if (generatedArticles) {
      setGeneratedArticles({
        ...generatedArticles,
        [lang]: { ...generatedArticles[lang], ...updates }
      });
    }
  };

  const handleSaveDraft = async () => {
    if (!generatedArticles) return;

    setIsPublishing(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const draftData = {
        user_id: userData.user.id,
        source_url: articleUrl,
        source_title: articleTitle,
        source_image: articleImage || null,
        source_name: articleSource || null,
        hebrew_title: generatedArticles.hebrew.title,
        hebrew_content: generatedArticles.hebrew.content,
        hebrew_meta_description: generatedArticles.hebrew.metaDescription,
        hebrew_keywords: generatedArticles.hebrew.keywords,
        english_title: generatedArticles.english.title,
        english_content: generatedArticles.english.content,
        english_meta_description: generatedArticles.english.metaDescription,
        english_keywords: generatedArticles.english.keywords,
        status: "draft",
        unsplash_photo_url: unsplashPhotoUrl || null,
      };

      if (draftId) {
        // Update existing draft
        const { error } = await supabase
          .from("article_drafts")
          .update(draftData)
          .eq("id", draftId);

        if (error) throw error;
        toast.success("הטיוטה עודכנה");
      } else {
        // Create new draft
        const { data, error } = await supabase
          .from("article_drafts")
          .insert(draftData)
          .select("id")
          .single();

        if (error) throw error;
        
        // Set draft ID for future updates
        setDraftId(data.id);
        
        toast.success("הכתבה נשמרה בטיוטות", {
          action: {
            label: "עבור לטיוטות",
            onClick: () => navigate("/drafts"),
          },
        });
      }
    } catch (error: any) {
      console.error("Save draft error:", error);
      toast.error(error.message || "שגיאה בשמירת הטיוטה");
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublish = async (status: "draft" | "publish") => {
    if (!generatedArticles) return;

    const currentArticle = generatedArticles[activeLanguage];

    setIsPublishing(true);
    try {
      const { data, error } = await supabase.functions.invoke("publish-to-wordpress", {
        body: {
          title: currentArticle.title,
          content: currentArticle.content,
          keywords: currentArticle.keywords,
          categories: currentArticle.categories || [],
          metaDescription: currentArticle.metaDescription,
          featuredImage: articleImage,
          status,
          language: activeLanguage,
          sourceUrl: articleUrl,
          unsplashPhotoUrl,
          photographerName,
        },
      });

      if (error) throw error;

      // Update draft status if we have a draft
      if (draftId && status === "publish") {
        const newStatus = activeLanguage === 'hebrew' ? 'published_hebrew' : 'published_english';
        await supabase
          .from("article_drafts")
          .update({ 
            status: newStatus,
            [`wordpress_${activeLanguage}_id`]: data.postId?.toString(),
            [`wordpress_${activeLanguage}_url`]: data.postUrl 
          })
          .eq("id", draftId);
      }

      if (data.postUrl) {
        toast.success(
          status === "publish" ? "הכתבה פורסמה!" : "הכתבה נשמרה כטיוטה בוורדפרס",
          {
            action: {
              label: "פתח בוורדפרס",
              onClick: () => window.open(data.postUrl, "_blank"),
            },
          }
        );
      } else {
        toast.success(status === "publish" ? "הכתבה פורסמה!" : "הכתבה נשמרה כטיוטה בוורדפרס");
      }
    } catch (error: any) {
      console.error("Publish error:", error);
      toast.error(error.message || "שגיאה בפרסום לוורדפרס");
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoadingDraft) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(draftId ? "/drafts" : "/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            <div>
              <h1 className="font-mono text-lg md:text-xl font-bold">
                {draftId ? "עריכת טיוטה" : "יצירת כתבה"}
              </h1>
              <p className="font-mono text-[10px] md:text-xs text-muted-foreground">
                {draftId ? "ערוך והמשך לעבוד על הכתבה" : "צור כתבה מותאמת SEO בסגנון i-HLS"}
              </p>
            </div>
          </div>
          {draftId && (
            <Badge variant="tactical" className="ml-auto">
              עריכה
            </Badge>
          )}
        </div>

        {/* Source Article Preview */}
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-mono text-sm">כתבת המקור</CardTitle>
              <Badge variant="outline">{articleSource}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Duplicate Warning */}
            {isCheckingDuplicate && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                בודק אם הכתבה כבר פורסמה...
              </div>
            )}
            
            {duplicateWarning?.exists && (
              <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-200">
                  <div className="font-medium mb-1">⚠️ כתבה דומה כבר קיימת בוורדפרס:</div>
                  <ul className="text-xs space-y-1">
                    {duplicateWarning.posts.map((post) => (
                      <li key={post.id} className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {post.status === 'publish' ? 'פורסם' : post.status === 'draft' ? 'טיוטה' : post.status}
                        </Badge>
                        <a
                          href={post.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline truncate max-w-[300px]"
                        >
                          {post.title.replace(/&#8211;/g, '-').replace(/&amp;/g, '&')}
                        </a>
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-4">
              {articleImage && (
                <img
                  src={articleImage}
                  alt=""
                  className="w-32 h-20 object-cover rounded-md flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm leading-tight mb-2 line-clamp-2">
                  {articleTitle}
                </h3>
                <a
                  href={articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  פתח מקור <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {!generatedArticles && (
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
                variant="tactical"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    יוצר כתבות (עברית + אנגלית)...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    צור כתבות (עברית + אנגלית)
                  </>
                )}
              </Button>
            )}

            {generatedArticles && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-xs text-muted-foreground">הערות לתיקון</span>
                  </div>
                  <Textarea
                    value={correctionNotes}
                    onChange={(e) => setCorrectionNotes(e.target.value)}
                    placeholder="כתוב כאן מה לשנות בכתבה... לדוגמה: שנה את הכותרת, הוסף פרטים על המייסדים, קצר את הפסקה השנייה..."
                    className="min-h-[80px] text-sm font-mono"
                    dir="rtl"
                  />
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      מייצר מחדש...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      {correctionNotes.trim() ? "ג'נרט עם תיקונים" : "ג'נרט שוב"}
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generated Article Editor */}
        {generatedArticles && (
          <ArticleEditor
            hebrewArticle={generatedArticles.hebrew}
            englishArticle={generatedArticles.english}
            activeLanguage={activeLanguage}
            onLanguageChange={setActiveLanguage}
            onUpdateHebrew={(updates) => handleUpdateArticle('hebrew', updates)}
            onUpdateEnglish={(updates) => handleUpdateArticle('english', updates)}
            onSaveDraft={handleSaveDraft}
            onPublish={handlePublish}
            isPublishing={isPublishing}
            featuredImage={articleImage}
            sourceUrl={articleUrl}
            isEditMode={!!draftId}
            onUpdateFeaturedImage={setArticleImage}
            unsplashPhotoUrl={unsplashPhotoUrl}
            onUpdateUnsplashData={(photoUrl, photographer) => {
              setUnsplashPhotoUrl(photoUrl);
              setPhotographerName(photographer);
            }}
          />
        )}
      </div>
    </Layout>
  );
}
