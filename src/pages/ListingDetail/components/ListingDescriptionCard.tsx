import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ListingDescriptionCardProps {
  description: string | null;
}

export function ListingDescriptionCard({ description }: ListingDescriptionCardProps) {
  if (!description) return null;

  return (
    <Card className="border-2 shadow-md">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardTitle className="text-lg md:text-xl flex items-center gap-2">
          <div className="h-1 w-8 bg-gradient-to-r from-primary to-primary/50 rounded-full" />
          İlan Açıklaması
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 md:p-6">
        <p className="text-sm md:text-base text-foreground leading-relaxed whitespace-pre-line">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
