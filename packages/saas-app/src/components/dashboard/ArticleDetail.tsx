import { X, ExternalLink, Send, Save, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Article } from "@/types/article";
import { useState } from "react";

interface ArticleDetailProps {
  article: Article;
  onClose: () => void;
  onSave: (article: Article) => void;
  onPublish: (article: Article) => void;
}

export function ArticleDetail({ article, onClose, onSave, onPublish }: ArticleDetailProps) {
  const [hebrewTitle, setHebrewTitle] = useState(article.hebrewTitle);
  const [hebrewContent, setHebrewContent] = useState(article.hebrewContent);
  const [englishTitle, setEnglishTitle] = useState(article.englishTitle);
  const [englishContent, setEnglishContent] = useState(article.englishContent);
  const [metaDescription, setMetaDescription] = useState(article.metaDescription);

  const handleSave = () => {
    onSave({
      ...article,
      hebrewTitle,
      hebrewContent,
      englishTitle,
      englishContent,
      metaDescription,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-4 z-50 rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <div className="flex items-center gap-4">
            <Badge variant="tactical">ARTICLE EDITOR</Badge>
            <span className="font-mono text-sm text-muted-foreground">
              ID: {article.id.slice(0, 8)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="surface" size="sm" onClick={handleSave}>
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
            <Button variant="tactical" size="sm" onClick={() => onPublish(article)}>
              <Send className="h-4 w-4" />
              Publish to WP
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-[350px_1fr] h-[calc(100%-73px)]">
          {/* Left Sidebar - Source Info */}
          <div className="border-r border-border p-6 space-y-6 overflow-auto">
            {/* Source Image */}
            <div className="rounded-lg border border-border overflow-hidden">
              {article.ogImage ? (
                <img
                  src={article.ogImage}
                  alt="Article thumbnail"
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-surface flex items-center justify-center">
                  <div className="text-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                    <span className="font-mono text-xs text-destructive">
                      NO IMAGE - MANUAL REVIEW
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Source Details */}
            <div className="space-y-4">
              <div>
                <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Source
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-medium text-sm">{article.sourceDomain}</span>
                  <a
                    href={article.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <div>
                <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Original Title
                </label>
                <p className="font-medium text-sm mt-1">{article.sourceTitle}</p>
              </div>

              <div>
                <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Relevance Score
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${article.relevanceScore * 10}%` }}
                    />
                  </div>
                  <span className="font-mono text-sm font-bold text-primary">
                    {article.relevanceScore}/10
                  </span>
                </div>
              </div>

              <div>
                <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Tags
                </label>
                <div className="flex flex-wrap gap-1 mt-2">
                  {article.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Meta Description
                </label>
                <Textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  className="mt-1 font-mono text-xs h-20"
                  placeholder="SEO meta description..."
                />
              </div>
            </div>
          </div>

          {/* Right - Bilingual Editor */}
          <div className="p-6 overflow-auto">
            <Tabs defaultValue="english" className="h-full flex flex-col">
              <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                <TabsTrigger value="english" className="font-mono">
                  🇬🇧 English
                </TabsTrigger>
                <TabsTrigger value="hebrew" className="font-mono">
                  🇮🇱 עברית
                </TabsTrigger>
              </TabsList>

              <TabsContent value="english" className="flex-1 mt-4 space-y-4">
                <div>
                  <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Title (H1)
                  </label>
                  <Input
                    value={englishTitle}
                    onChange={(e) => setEnglishTitle(e.target.value)}
                    className="mt-1 font-medium text-lg"
                    placeholder="Article title..."
                  />
                </div>
                <div className="flex-1">
                  <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Content
                  </label>
                  <Textarea
                    value={englishContent}
                    onChange={(e) => setEnglishContent(e.target.value)}
                    className="mt-1 min-h-[400px] font-sans"
                    placeholder="Article content..."
                  />
                </div>
              </TabsContent>

              <TabsContent value="hebrew" className="flex-1 mt-4 space-y-4">
                <div>
                  <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    כותרת (H1)
                  </label>
                  <Input
                    value={hebrewTitle}
                    onChange={(e) => setHebrewTitle(e.target.value)}
                    className="mt-1 font-medium text-lg rtl-text"
                    placeholder="כותרת המאמר..."
                    dir="rtl"
                  />
                </div>
                <div className="flex-1">
                  <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    תוכן
                  </label>
                  <Textarea
                    value={hebrewContent}
                    onChange={(e) => setHebrewContent(e.target.value)}
                    className="mt-1 min-h-[400px] font-sans rtl-text"
                    placeholder="תוכן המאמר..."
                    dir="rtl"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
