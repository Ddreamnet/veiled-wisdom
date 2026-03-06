import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ListingDescriptionCardProps {
  description: string | null;
}

export function ListingDescriptionCard({ description }: ListingDescriptionCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!description) return null;

  const isLong = description.length > 300;

  return (
    <Card className="border border-border/40 shadow-sm rounded-xl">
      <CardHeader className="px-4 py-2.5 bg-gradient-to-r from-primary/3 to-primary/6">
        <CardTitle className="text-sm md:text-base font-semibold flex items-center gap-2">
          <div className="h-0.5 w-5 bg-gradient-to-r from-primary to-primary/40 rounded-full" />
          İlan Açıklaması
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <p className={`text-xs md:text-sm text-foreground leading-relaxed whitespace-pre-line ${!expanded && isLong ? 'line-clamp-4' : ''}`}>
          {description}
        </p>
        {isLong && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="mt-2 h-7 px-2 text-xs text-primary hover:text-primary/80"
          >
            {expanded ? (
              <>Daha az göster <ChevronUp className="h-3 w-3 ml-1" /></>
            ) : (
              <>Devamını oku <ChevronDown className="h-3 w-3 ml-1" /></>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
