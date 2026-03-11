import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Save, 
  Upload, 
  Eye, 
  Edit3, 
  Tag, 
  X, 
  Plus,
  FileText,
  Loader2,
  ExternalLink,
  Columns,
  Sparkles,
  FolderOpen,
  RefreshCw,
  Check,
  ChevronsUpDown,
  ImageIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UnsplashImageSearch } from "./UnsplashImageSearch";

interface WordPressCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
  parent: number; // 0 = no parent (top-level)
}

interface WordPressTag {
  id: number;
  name: string;
  slug: string;
  count: number;
}

interface ArticleVersion {
  title: string;
  content: string;
  keywords: string[];
  metaDescription: string;
  categories?: string[];
}

interface ArticleEditorProps {
  hebrewArticle: ArticleVersion;
  englishArticle: ArticleVersion;
  activeLanguage: 'hebrew' | 'english';
  onLanguageChange: (lang: 'hebrew' | 'english') => void;
  onUpdateHebrew: (updates: Partial<ArticleVersion>) => void;
  onUpdateEnglish: (updates: Partial<ArticleVersion>) => void;
  onSaveDraft?: () => void;
  onPublish: (status: "draft" | "publish") => void;
  isPublishing: boolean;
  featuredImage?: string;
  sourceUrl?: string;
  isEditMode?: boolean;
  onUpdateFeaturedImage?: (imageUrl: string) => void;
  unsplashPhotoUrl?: string;
  onUpdateUnsplashData?: (unsplashPhotoUrl: string, photographerName: string) => void;
}

// Helper component for single language editor
function LanguageEditor({
  article,
  onUpdate,
  isRTL,
  languageLabel,
  newKeyword,
  setNewKeyword,
  compact = false,
  onGenerateAlternativeTitles,
  isGeneratingTitles = false,
  wordpressCategories = [],
  isLoadingCategories = false,
  onSyncCategories,
  wordpressTags = [],
  isLoadingTags = false,
  onSyncTags,
}: {
  article: ArticleVersion;
  onUpdate: (updates: Partial<ArticleVersion>) => void;
  isRTL: boolean;
  languageLabel: string;
  newKeyword: string;
  setNewKeyword: (val: string) => void;
  compact?: boolean;
  onGenerateAlternativeTitles?: () => void;
  isGeneratingTitles?: boolean;
  wordpressCategories?: WordPressCategory[];
  isLoadingCategories?: boolean;
  onSyncCategories?: () => void;
  wordpressTags?: WordPressTag[];
  isLoadingTags?: boolean;
  onSyncTags?: () => void;
}) {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const wordCount = article.content.trim().split(/\s+/).filter(Boolean).length;

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !article.keywords.includes(newKeyword.trim())) {
      onUpdate({ keywords: [...article.keywords, newKeyword.trim()] });
      setNewKeyword("");
    }
  };

  const handleAddTag = (tagName: string) => {
    if (tagName && !article.keywords.includes(tagName)) {
      onUpdate({ keywords: [...article.keywords, tagName] });
    }
    setTagOpen(false);
  };

  const handleRemoveKeyword = (keyword: string) => {
    onUpdate({ keywords: article.keywords.filter((k) => k !== keyword) });
  };

  const handleAddCategory = (categoryName: string) => {
    if (categoryName && !(article.categories || []).includes(categoryName)) {
      onUpdate({ categories: [...(article.categories || []), categoryName] });
    }
    setCategoryOpen(false);
  };

  const handleRemoveCategory = (category: string) => {
    onUpdate({ categories: (article.categories || []).filter((c) => c !== category) });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  // Filter out already selected categories
  const availableCategories = wordpressCategories.filter(
    cat => !(article.categories || []).includes(cat.name)
  );

  // Filter out already selected tags AND tags that are already selected as categories
  const selectedCategoryNames = (article.categories || []).map(c => c.toLowerCase());
  const availableTags = wordpressTags.filter(
    tag => !article.keywords.includes(tag.name) && 
           !selectedCategoryNames.includes(tag.name.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* Header with word count */}
      <div className="flex items-center justify-between">
        <Label className="font-mono text-xs font-bold">{languageLabel}</Label>
        <Badge variant={wordCount >= 320 && wordCount <= 380 ? "tactical" : "secondary"} className="text-[10px]">
          {wordCount} {isRTL ? 'מילים' : 'words'}
        </Badge>
      </div>

      {/* Title with Generate Alternative Titles button */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="font-mono text-[10px] text-muted-foreground">
            {isRTL ? 'כותרת' : 'Title'}
          </Label>
          {onGenerateAlternativeTitles && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onGenerateAlternativeTitles}
              disabled={isGeneratingTitles}
              className="h-6 px-2 text-[10px] text-primary hover:text-primary/80"
            >
              {isGeneratingTitles ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {isRTL ? 'כותרות אלטרנטיביות' : 'Alt Titles'}
            </Button>
          )}
        </div>
        <Input
          value={article.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className={`font-medium ${compact ? 'h-8 text-sm' : ''}`}
          dir={isRTL ? "rtl" : "ltr"}
        />
        <p className="text-[9px] text-muted-foreground">
          {article.title.length}/60
        </p>
      </div>

      {/* Meta Description */}
      <div className="space-y-1">
        <Label className="font-mono text-[10px] text-muted-foreground">
          {isRTL ? 'ביטוי SEO' : 'SEO Phrase'}
        </Label>
        <Input
          value={article.metaDescription}
          onChange={(e) => onUpdate({ metaDescription: e.target.value })}
          placeholder={isRTL ? "3-6 מילות מפתח" : "3-6 keywords"}
          className={compact ? 'h-8 text-sm' : ''}
          dir={isRTL ? "rtl" : "ltr"}
        />
      </div>

      {/* Categories with WordPress Sync */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
            <FolderOpen className="h-3 w-3" />
            {isRTL ? 'קטגוריות' : 'Categories'}
          </Label>
          {onSyncCategories && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onSyncCategories}
              disabled={isLoadingCategories}
              className="h-5 px-1.5 text-[9px] text-muted-foreground hover:text-primary"
            >
              {isLoadingCategories ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              {isRTL ? 'סנכרן מWP' : 'Sync from WP'}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mb-1">
          {(article.categories || []).map((category) => (
            <Badge
              key={category}
              variant="default"
              className="flex items-center gap-1 pr-1 text-[10px] py-0 bg-primary/20 text-primary"
            >
              {category}
              <button
                onClick={() => handleRemoveCategory(category)}
                className="hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="h-2 w-2" />
              </button>
            </Badge>
          ))}
        </div>
        <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={categoryOpen}
              className={cn(
                "w-full justify-between",
                compact ? "h-7 text-xs" : "h-8"
              )}
            >
              {isRTL ? 'בחר קטגוריה...' : 'Select category...'}
              <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder={isRTL ? "חפש קטגוריה..." : "Search category..."} />
              <CommandList>
                <CommandEmpty>
                  {isLoadingCategories ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    isRTL ? 'לא נמצאו קטגוריות' : 'No categories found'
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {availableCategories.map((cat) => (
                    <CommandItem
                      key={cat.id}
                      value={cat.name}
                      onSelect={() => handleAddCategory(cat.name)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          (article.categories || []).includes(cat.name) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {/* Indent child categories */}
                      <span className={cat.parent !== 0 ? "ml-4" : ""}>
                        {cat.parent !== 0 && "└ "}
                        {cat.name}
                      </span>
                      <span className="ml-auto text-[9px] text-muted-foreground">
                        ({cat.count})
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Tags (was Keywords) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
            <Tag className="h-3 w-3" />
            {isRTL ? 'תגיות' : 'Tags'}
          </Label>
          {onSyncTags && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onSyncTags}
              disabled={isLoadingTags}
              className="h-5 px-1.5 text-[9px] text-muted-foreground hover:text-primary"
            >
              {isLoadingTags ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              {isRTL ? 'סנכרן מWP' : 'Sync from WP'}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mb-1">
          {article.keywords.map((keyword) => (
            <Badge
              key={keyword}
              variant="secondary"
              className="flex items-center gap-1 pr-1 text-[10px] py-0"
            >
              {keyword}
              <button
                onClick={() => handleRemoveKeyword(keyword)}
                className="hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="h-2 w-2" />
              </button>
            </Badge>
          ))}
        </div>
        <Popover open={tagOpen} onOpenChange={setTagOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={tagOpen}
              className={cn(
                "w-full justify-between mb-1",
                compact ? "h-7 text-xs" : "h-8"
              )}
            >
              {isRTL ? 'בחר תגית מוורדפרס...' : 'Select WP tag...'}
              <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder={isRTL ? "חפש תגית..." : "Search tag..."} />
              <CommandList>
                <CommandEmpty>
                  {isLoadingTags ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    isRTL ? 'לא נמצאו תגיות' : 'No tags found'
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {availableTags.slice(0, 50).map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.name}
                      onSelect={() => handleAddTag(tag.name)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          article.keywords.includes(tag.name) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {tag.name}
                      <span className="ml-auto text-[9px] text-muted-foreground">
                        ({tag.count})
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <div className="flex gap-1">
          <Input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isRTL ? 'או הקלד תגית חדשה...' : 'Or type custom tag...'}
            className={`flex-1 ${compact ? 'h-7 text-xs' : 'h-8'}`}
            dir={isRTL ? "rtl" : "ltr"}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAddKeyword}
            className={compact ? 'h-7 w-7' : 'h-8 w-8'}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {isRTL ? 'תוכן' : 'Content'}
          </Label>
          <span className={`text-[10px] ${wordCount >= 320 && wordCount <= 380 ? 'text-primary' : 'text-muted-foreground'}`}>
            {wordCount}/350
          </span>
        </div>
        <Textarea
          value={article.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          rows={compact ? 12 : 15}
          className="font-sans leading-relaxed text-sm"
          dir={isRTL ? "rtl" : "ltr"}
        />
      </div>
    </div>
  );
}

export function ArticleEditor({
  hebrewArticle,
  englishArticle,
  activeLanguage,
  onLanguageChange,
  onUpdateHebrew,
  onUpdateEnglish,
  onSaveDraft,
  onPublish,
  isPublishing,
  featuredImage,
  sourceUrl,
  isEditMode = false,
  onUpdateFeaturedImage,
  unsplashPhotoUrl,
  onUpdateUnsplashData,
}: ArticleEditorProps) {
  const [newKeywordHe, setNewKeywordHe] = useState("");
  const [newKeywordEn, setNewKeywordEn] = useState("");
  const [activeTab, setActiveTab] = useState("split");
  const [isGeneratingTitlesHe, setIsGeneratingTitlesHe] = useState(false);
  const [isGeneratingTitlesEn, setIsGeneratingTitlesEn] = useState(false);
  const [alternativeTitles, setAlternativeTitles] = useState<{he: string[], en: string[]}>({he: [], en: []});
  
  // WordPress categories
  const [wordpressCategories, setWordpressCategories] = useState<WordPressCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // WordPress tags
  const [wordpressTags, setWordpressTags] = useState<WordPressTag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);

  const currentArticle = activeLanguage === 'hebrew' ? hebrewArticle : englishArticle;
  const isRTL = activeLanguage === 'hebrew';

  // Auto-assign categories based on article content
  const autoAssignCategories = (wpCategories: WordPressCategory[]) => {
    const wpCategoryNames = wpCategories.map(c => c.name);
    
    // Base categories - always added to every startup article
    const BASE_CATEGORIES = [
      "Companies", "News", "Startups News", "Security", "Defense",
      "HLS", "Startup", "Technology", "Defense Tech", "Innovation",
      "Technology News", "New Products"
    ];

    // Contextual categories - added only if keywords appear in article content
    const CONTEXTUAL_CATEGORY_MAP: Record<string, string[]> = {
      // Missiles / Air Defense
      "missile": ["Air & Missile Defense", "Weapons", "Ballistic and artillery"],
      "ballistic": ["Air & Missile Defense", "Weapons", "Ballistic and artillery"],
      "air defense": ["Air & Missile Defense"],
      "iron dome": ["Air & Missile Defense"],
      "interceptor": ["Air & Missile Defense"],
      "artillery": ["Ballistic and artillery", "Weapons"],
      // Drones / Unmanned
      "drone": ["Unmanned Systems", "Drones", "Drone warfare"],
      "uav": ["Unmanned Systems", "Drones"],
      "unmanned": ["Unmanned Systems"],
      "swarm": ["Unmanned Systems", "Drones"],
      "loitering munition": ["Unmanned Systems", "Drones", "Drone warfare", "Weapons"],
      // Electronic Warfare
      "electronic warfare": ["Electronic Warfare"],
      "ew ": ["Electronic Warfare"],
      "jamming": ["Electronic Warfare"],
      "counter-drone": ["Electronic Warfare", "Drones"],
      // Cyber
      "cyber": ["Cyber Security", "Cyber"],
      "cybersecurity": ["Cyber Security", "Cyber"],
      "ransomware": ["Cyber Security", "Cyber"],
      "malware": ["Cyber Security", "Cyber"],
      // Intelligence / ISR
      "intelligence": ["Intelligence"],
      "reconnaissance": ["Reconnaissance", "ISR"],
      "surveillance": ["Surveillance", "ISR"],
      "isr": ["ISR"],
      "geoint": ["Intelligence"],
      // Robotics
      "robot": ["Robots", "Robotics"],
      "autonomous": ["Robotics", "Autonomous Systems"],
      // Space / Satellite
      "satellite": ["Space", "Satellite"],
      "space": ["Space"],
      // Weapons
      "weapon": ["Weapons"],
      "munition": ["Weapons"],
      // Naval
      "naval": ["Naval"],
      "maritime": ["Naval"],
      // AI
      "artificial intelligence": ["AI", "Artificial Intelligence"],
      " ai ": ["AI"],
      // Radar / Sensors
      "radar": ["Radar", "Sensors"],
      "sensor": ["Sensors"],
      "lidar": ["Sensors"],
    };

    // Get content to analyze (combine both languages)
    const contentToAnalyze = [
      hebrewArticle.title, hebrewArticle.content,
      englishArticle.title, englishArticle.content
    ].join(" ").toLowerCase();

    // Start with base categories (only if they exist in WordPress)
    const assignedCategories = new Set<string>();
    for (const baseCat of BASE_CATEGORIES) {
      if (wpCategoryNames.some(n => n.toLowerCase() === baseCat.toLowerCase())) {
        assignedCategories.add(wpCategoryNames.find(n => n.toLowerCase() === baseCat.toLowerCase())!);
      }
    }

    // Add contextual categories based on content
    for (const [keyword, categories] of Object.entries(CONTEXTUAL_CATEGORY_MAP)) {
      if (contentToAnalyze.includes(keyword)) {
        for (const cat of categories) {
          const wpMatch = wpCategoryNames.find(n => n.toLowerCase() === cat.toLowerCase());
          if (wpMatch) {
            assignedCategories.add(wpMatch);
          }
        }
      }
    }

    const categoriesArray = Array.from(assignedCategories);
    
    // Only auto-assign if the article doesn't already have categories
    if (!(hebrewArticle.categories?.length) && categoriesArray.length > 0) {
      onUpdateHebrew({ categories: categoriesArray });
      onUpdateEnglish({ categories: categoriesArray });
      console.log(`Auto-assigned ${categoriesArray.length} categories:`, categoriesArray);
    }
  };

  // Fetch WordPress categories and tags on mount
  useEffect(() => {
    syncWordPressCategories();
    syncWordPressTags();
  }, []);

  const syncWordPressCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-wordpress-categories");
      
      if (error) throw error;
      
      if (data?.categories) {
        setWordpressCategories(data.categories);
        autoAssignCategories(data.categories);
        toast.success(`סונכרנו ${data.categories.length} קטגוריות מוורדפרס`);
      }
    } catch (error) {
      console.error("Sync categories error:", error);
      toast.error("שגיאה בסנכרון קטגוריות מוורדפרס");
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const syncWordPressTags = async () => {
    setIsLoadingTags(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-wordpress-tags");
      
      if (error) throw error;
      
      if (data?.tags) {
        setWordpressTags(data.tags);
        toast.success(`סונכרנו ${data.tags.length} תגיות מוורדפרס`);
      }
    } catch (error) {
      console.error("Sync tags error:", error);
      toast.error("שגיאה בסנכרון תגיות מוורדפרס");
    } finally {
      setIsLoadingTags(false);
    }
  };

  const generateAlternativeTitles = async (lang: 'hebrew' | 'english') => {
    const setLoading = lang === 'hebrew' ? setIsGeneratingTitlesHe : setIsGeneratingTitlesEn;
    const article = lang === 'hebrew' ? hebrewArticle : englishArticle;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-alternative-titles", {
        body: {
          content: article.content.substring(0, 500),
          currentTitle: article.title,
          language: lang,
        },
      });

      if (error) throw error;

      if (data?.titles && data.titles.length > 0) {
        setAlternativeTitles(prev => ({
          ...prev,
          [lang === 'hebrew' ? 'he' : 'en']: data.titles
        }));
        toast.success(lang === 'hebrew' ? 'נוצרו כותרות אלטרנטיביות' : 'Alternative titles generated');
      }
    } catch (error) {
      console.error("Generate titles error:", error);
      toast.error(lang === 'hebrew' ? 'שגיאה ביצירת כותרות' : 'Error generating titles');
    } finally {
      setLoading(false);
    }
  };

  const selectAlternativeTitle = (title: string, lang: 'hebrew' | 'english') => {
    if (lang === 'hebrew') {
      onUpdateHebrew({ title });
    } else {
      onUpdateEnglish({ title });
    }
    setAlternativeTitles(prev => ({
      ...prev,
      [lang === 'hebrew' ? 'he' : 'en']: []
    }));
  };

  // Check if image is from Unsplash
  const isUnsplashImage = (imageUrl: string): boolean => {
    return imageUrl.includes('unsplash.com');
  };

  const unsplashImage = featuredImage ? isUnsplashImage(featuredImage) : false;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="font-mono text-sm flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            עורך כתבה
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Alternative Titles Suggestions */}
        {alternativeTitles.he.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
            <Label className="font-mono text-xs text-primary flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              כותרות אלטרנטיביות (עברית) - לחץ לבחירה
            </Label>
            <div className="space-y-1">
              {alternativeTitles.he.map((title, i) => (
                <button
                  key={i}
                  onClick={() => selectAlternativeTitle(title, 'hebrew')}
                  className="w-full text-right p-2 text-sm bg-background hover:bg-primary/10 rounded border border-border transition-colors"
                  dir="rtl"
                >
                  {title}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {alternativeTitles.en.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
            <Label className="font-mono text-xs text-primary flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Alternative Titles (English) - Click to select
            </Label>
            <div className="space-y-1">
              {alternativeTitles.en.map((title, i) => (
                <button
                  key={i}
                  onClick={() => selectAlternativeTitle(title, 'english')}
                  className="w-full text-left p-2 text-sm bg-background hover:bg-primary/10 rounded border border-border transition-colors"
                >
                  {title}
                </button>
              ))}
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="split" className="flex items-center gap-2">
              <Columns className="h-3 w-3" />
              Split View
            </TabsTrigger>
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Edit3 className="h-3 w-3" />
              {activeLanguage === 'hebrew' ? 'עברית' : 'English'}
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-3 w-3" />
              תצוגה מקדימה
            </TabsTrigger>
          </TabsList>

          {/* Split View - Both Languages Side by Side */}
          <TabsContent value="split" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Hebrew Side */}
              <div className="border border-border rounded-lg p-4 bg-muted/30">
                <LanguageEditor
                  article={hebrewArticle}
                  onUpdate={onUpdateHebrew}
                  isRTL={true}
                  languageLabel="🇮🇱 עברית"
                  newKeyword={newKeywordHe}
                  setNewKeyword={setNewKeywordHe}
                  compact={true}
                  onGenerateAlternativeTitles={() => generateAlternativeTitles('hebrew')}
                  isGeneratingTitles={isGeneratingTitlesHe}
                  wordpressCategories={wordpressCategories}
                  isLoadingCategories={isLoadingCategories}
                  onSyncCategories={syncWordPressCategories}
                  wordpressTags={wordpressTags}
                  isLoadingTags={isLoadingTags}
                  onSyncTags={syncWordPressTags}
                />
              </div>
              
              {/* English Side */}
              <div className="border border-border rounded-lg p-4 bg-muted/30">
                <LanguageEditor
                  article={englishArticle}
                  onUpdate={onUpdateEnglish}
                  isRTL={false}
                  languageLabel="🇺🇸 English"
                  newKeyword={newKeywordEn}
                  setNewKeyword={setNewKeywordEn}
                  compact={true}
                  onGenerateAlternativeTitles={() => generateAlternativeTitles('english')}
                  isGeneratingTitles={isGeneratingTitlesEn}
                  wordpressCategories={wordpressCategories}
                  isLoadingCategories={isLoadingCategories}
                  onSyncCategories={syncWordPressCategories}
                  wordpressTags={wordpressTags}
                  isLoadingTags={isLoadingTags}
                  onSyncTags={syncWordPressTags}
                />
              </div>
            </div>
          </TabsContent>

          {/* Single Language Edit */}
          <TabsContent value="edit" className="space-y-4 mt-4">
            {/* Language Toggle */}
            <div className="flex items-center gap-2 bg-muted rounded-lg p-1 w-fit">
              <Button
                variant={activeLanguage === 'hebrew' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onLanguageChange('hebrew')}
                className="h-8 px-3"
              >
                🇮🇱 עברית
              </Button>
              <Button
                variant={activeLanguage === 'english' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onLanguageChange('english')}
                className="h-8 px-3"
              >
                🇺🇸 English
              </Button>
            </div>

            <LanguageEditor
              article={currentArticle}
              onUpdate={activeLanguage === 'hebrew' ? onUpdateHebrew : onUpdateEnglish}
              isRTL={isRTL}
              languageLabel={activeLanguage === 'hebrew' ? 'עברית' : 'English'}
              newKeyword={activeLanguage === 'hebrew' ? newKeywordHe : newKeywordEn}
              setNewKeyword={activeLanguage === 'hebrew' ? setNewKeywordHe : setNewKeywordEn}
              onGenerateAlternativeTitles={() => generateAlternativeTitles(activeLanguage)}
              isGeneratingTitles={activeLanguage === 'hebrew' ? isGeneratingTitlesHe : isGeneratingTitlesEn}
              wordpressCategories={wordpressCategories}
              isLoadingCategories={isLoadingCategories}
              onSyncCategories={syncWordPressCategories}
              wordpressTags={wordpressTags}
              isLoadingTags={isLoadingTags}
              onSyncTags={syncWordPressTags}
            />
          </TabsContent>

          {/* Preview */}
          <TabsContent value="preview" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Hebrew Preview */}
              <div 
                className="rounded-lg border border-border bg-card p-4 space-y-3" 
                dir="rtl"
              >
                <Badge variant="outline" className="mb-2">🇮🇱 עברית</Badge>
                {featuredImage && (
                  <img
                    src={featuredImage}
                    alt=""
                    className="w-full h-32 object-cover rounded-lg"
                  />
                )}
                <h1 className="text-lg font-bold leading-tight">{hebrewArticle.title}</h1>
                <p className="text-xs text-muted-foreground">
                  SEO: {hebrewArticle.metaDescription}
                </p>
                {(hebrewArticle.categories || []).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[9px] text-muted-foreground">קטגוריות:</span>
                    {(hebrewArticle.categories || []).map((cat) => (
                      <Badge key={cat} variant="default" className="text-[9px] bg-primary/20 text-primary">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  <span className="text-[9px] text-muted-foreground">תגיות:</span>
                  {hebrewArticle.keywords.map((keyword) => (
                    <Badge key={keyword} variant="outline" className="text-[9px]">
                      {keyword}
                    </Badge>
                  ))}
                </div>
                <div className="prose prose-sm max-w-none text-sm">
                  {hebrewArticle.content.split("\n\n").map((paragraph, i) => (
                    <p key={i} className="mb-2 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              {/* English Preview */}
              <div 
                className="rounded-lg border border-border bg-card p-4 space-y-3" 
                dir="ltr"
              >
                <Badge variant="outline" className="mb-2">🇺🇸 English</Badge>
                {featuredImage && (
                  <img
                    src={featuredImage}
                    alt=""
                    className="w-full h-32 object-cover rounded-lg"
                  />
                )}
                <h1 className="text-lg font-bold leading-tight">{englishArticle.title}</h1>
                <p className="text-xs text-muted-foreground">
                  SEO: {englishArticle.metaDescription}
                </p>
                {(englishArticle.categories || []).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[9px] text-muted-foreground">Categories:</span>
                    {(englishArticle.categories || []).map((cat) => (
                      <Badge key={cat} variant="default" className="text-[9px] bg-primary/20 text-primary">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  <span className="text-[9px] text-muted-foreground">Tags:</span>
                  {englishArticle.keywords.map((keyword) => (
                    <Badge key={keyword} variant="outline" className="text-[9px]">
                      {keyword}
                    </Badge>
                  ))}
                </div>
                <div className="prose prose-sm max-w-none text-sm">
                  {englishArticle.content.split("\n\n").map((paragraph, i) => (
                    <p key={i} className="mb-2 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
          {/* Language selector for publishing */}
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <span className="text-xs text-muted-foreground px-2">פרסם:</span>
            <Button
              variant={activeLanguage === 'hebrew' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onLanguageChange('hebrew')}
              className="h-7 px-2 text-xs"
            >
              🇮🇱
            </Button>
            <Button
              variant={activeLanguage === 'english' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onLanguageChange('english')}
              className="h-7 px-2 text-xs"
            >
              🇺🇸
            </Button>
          </div>
          
          {onSaveDraft && (
            <Button
              onClick={onSaveDraft}
              disabled={isPublishing}
              variant="outline"
              className="flex-1"
            >
              {isPublishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
              <Save className="h-4 w-4" />
            )}
            {isEditMode ? "עדכן טיוטה" : "שמור בטיוטות"}
            </Button>
          )}
          <Button
            onClick={() => onPublish("draft")}
            disabled={isPublishing}
            variant="secondary"
            className="flex-1"
          >
            {isPublishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {activeLanguage === 'hebrew' ? 'טיוטה בוורדפרס' : 'WP Draft'}
          </Button>
          <Button
            onClick={() => onPublish("publish")}
            disabled={isPublishing}
            variant="tactical"
            className="flex-1"
          >
            {isPublishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {activeLanguage === 'hebrew' ? 'פרסם לוורדפרס' : 'Publish to WordPress'}
          </Button>
        </div>
        
        {/* Image source link - with proper Unsplash photo page URL */}
        {featuredImage && (
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <img 
                src={featuredImage} 
                alt="" 
                className="h-10 w-16 object-cover rounded"
              />
              {unsplashPhotoUrl ? (
                <a 
                  href={unsplashPhotoUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary flex items-center gap-1 underline text-xs"
                >
                  📷 {unsplashPhotoUrl.includes('unsplash.com') ? 'תמונה מ-Unsplash' : 'תמונת מקור'}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <a 
                  href={featuredImage} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary flex items-center gap-1 underline text-xs"
                >
                  📷 תמונה נבחרה
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            {onUpdateFeaturedImage && (
              <UnsplashImageSearch 
                currentImage={featuredImage}
                onSelectImage={(imageUrl, unsplashPageUrl, photographer) => {
                  onUpdateFeaturedImage(imageUrl);
                  onUpdateUnsplashData?.(unsplashPageUrl, photographer);
                }}
              />
            )}
          </div>
        )}
        {!featuredImage && onUpdateFeaturedImage && (
          <div className="flex items-center justify-end">
            <UnsplashImageSearch 
              onSelectImage={(imageUrl, unsplashPageUrl, photographer) => {
                onUpdateFeaturedImage(imageUrl);
                onUpdateUnsplashData?.(unsplashPageUrl, photographer);
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}