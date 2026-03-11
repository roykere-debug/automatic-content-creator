import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2, ImageIcon, ExternalLink, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UnsplashPhoto {
  id: string;
  description: string;
  thumb: string;
  small: string;
  regular: string;
  full: string;
  photographerName: string;
  photographerUsername: string;
  unsplashUrl: string;
}

interface UnsplashImageSearchProps {
  currentImage?: string;
  onSelectImage: (imageUrl: string, unsplashPageUrl: string, photographerName: string) => void;
}

export function UnsplashImageSearch({ currentImage, onSelectImage }: UnsplashImageSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<UnsplashPhoto | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);

  const handleSearch = async (newPage = 1) => {
    if (!query.trim()) {
      toast.error("הכנס מילות חיפוש");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-unsplash", {
        body: { query: query.trim(), page: newPage, perPage: 12 },
      });

      if (error) throw error;

      if (newPage === 1) {
        setPhotos(data.photos);
      } else {
        setPhotos((prev) => [...prev, ...data.photos]);
      }
      setTotalResults(data.total);
      setPage(newPage);
    } catch (error) {
      console.error("Unsplash search error:", error);
      toast.error("שגיאה בחיפוש תמונות");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch(1);
    }
  };

  const handleSelectPhoto = (photo: UnsplashPhoto) => {
    setSelectedPhoto(photo);
  };

  const handleConfirmSelection = () => {
    if (selectedPhoto) {
      // Use regular size for the image URL (good balance of quality and size)
      onSelectImage(selectedPhoto.regular, selectedPhoto.unsplashUrl, selectedPhoto.photographerName);
      toast.success("התמונה נבחרה!");
      setOpen(false);
      setSelectedPhoto(null);
    }
  };

  const handleLoadMore = () => {
    handleSearch(page + 1);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Search className="h-4 w-4" />
          חפש תמונה
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono">
            <ImageIcon className="h-5 w-5" />
            חיפוש תמונות ב-Unsplash
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="חפש תמונה (לדוגמה: drone, military, technology)..."
              className="flex-1"
              dir="ltr"
            />
            <Button onClick={() => handleSearch(1)} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              חפש
            </Button>
          </div>

          {/* Search Tips */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            💡 טיפ: חפש באנגלית למגוון רחב יותר של תוצאות. נסה: "drone", "military technology", "cybersecurity", "AI robot"
          </div>

          {/* Results */}
          {totalResults > 0 && (
            <Label className="text-xs text-muted-foreground">
              נמצאו {totalResults.toLocaleString()} תוצאות
            </Label>
          )}

          <ScrollArea className="flex-1 min-h-0 max-h-[300px]">
            {photos.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      selectedPhoto?.id === photo.id
                        ? "border-primary ring-2 ring-primary/50"
                        : "border-transparent hover:border-primary/50"
                    }`}
                    onClick={() => handleSelectPhoto(photo)}
                  >
                    <img
                      src={photo.thumb}
                      alt={photo.description || "Unsplash photo"}
                      className="w-full h-24 object-cover"
                      loading="lazy"
                    />
                    {selectedPhoto?.id === photo.id && (
                      <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                        <Check className="h-8 w-8 text-white" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[9px] text-white truncate">
                        📷 {photo.photographerName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !isLoading && (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm">חפש תמונות להצגת תוצאות</p>
                </div>
              )
            )}

            {isLoading && photos.length > 0 && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </ScrollArea>

          {/* Load More */}
          {photos.length > 0 && photos.length < totalResults && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleLoadMore} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                טען עוד תמונות
              </Button>
            </div>
          )}

          {/* Selected Photo Preview */}
          {selectedPhoto && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <Label className="text-xs font-medium">תמונה נבחרת:</Label>
              <div className="flex gap-3 items-start">
                <img
                  src={selectedPhoto.small}
                  alt={selectedPhoto.description || "Selected photo"}
                  className="w-32 h-20 object-cover rounded"
                />
                <div className="flex-1 space-y-1">
                  <p className="text-sm line-clamp-2">
                    {selectedPhoto.description || "ללא תיאור"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    צלם: {selectedPhoto.photographerName}
                  </p>
                  <a
                    href={selectedPhoto.unsplashUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    צפה ב-Unsplash <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Button */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleConfirmSelection}
              disabled={!selectedPhoto}
              variant="tactical"
            >
              <Check className="h-4 w-4" />
              בחר תמונה
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
