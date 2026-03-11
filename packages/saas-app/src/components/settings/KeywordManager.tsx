import { useState } from "react";
import { Plus, X, Tag, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Keyword } from "@/types/article";

interface KeywordManagerProps {
  keywords: Keyword[];
  onAdd: (term: string, category: string) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
}

const categories = [
  "UAV & Drones",
  "Cyber Security",
  "Border Security",
  "Defense Systems",
  "Intelligence",
  "Maritime",
  "Space & Satellite",
  "Counter-Terrorism",
];

export function KeywordManager({ keywords, onAdd, onRemove, onToggle }: KeywordManagerProps) {
  const [newTerm, setNewTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);

  const handleAdd = () => {
    if (newTerm.trim()) {
      onAdd(newTerm.trim(), selectedCategory);
      setNewTerm("");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          <span className="font-mono text-sm font-medium">Search Keywords</span>
        </div>
        <Badge variant="tactical">{keywords.filter(k => k.isActive).length} ACTIVE</Badge>
      </div>

      <div className="p-4 space-y-4">
        {/* Add New Keyword */}
        <div className="flex gap-3">
          <Input
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            placeholder="Enter keyword or phrase..."
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="tactical" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {/* Keywords List */}
        <div className="space-y-2 max-h-[300px] overflow-auto">
          {keywords.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-mono text-sm text-muted-foreground">
                No keywords configured. Add some to start hunting.
              </p>
            </div>
          ) : (
            keywords.map((keyword) => (
              <div
                key={keyword.id}
                className={`flex items-center justify-between rounded-lg border p-3 transition-all ${
                  keyword.isActive
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-muted/30 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={keyword.isActive}
                    onCheckedChange={() => onToggle(keyword.id)}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{keyword.term}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {keyword.category}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(keyword.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
