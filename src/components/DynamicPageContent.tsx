import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DynamicPageContentProps {
  content: string;
  isLoading?: boolean;
}

export function DynamicPageContent({ content, isLoading }: DynamicPageContentProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 md:p-8 space-y-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-6 w-1/4 mt-4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  // Parse content: ## creates section headers, paragraphs separated by \n\n
  const sections = content.split('\n\n').filter(Boolean);

  return (
    <Card>
      <CardContent className="p-6 md:p-8 space-y-4 md:space-y-6">
        {sections.map((section, index) => {
          const trimmed = section.trim();
          
          // Check if it's a heading (starts with ##)
          if (trimmed.startsWith('## ')) {
            const headingText = trimmed.replace('## ', '');
            return (
              <h2 key={index} className="text-xl md:text-2xl font-semibold mt-4 first:mt-0">
                {headingText}
              </h2>
            );
          }
          
          // Regular paragraph - handle single line breaks within paragraphs
          const lines = trimmed.split('\n');
          return (
            <div key={index} className="space-y-2">
              {lines.map((line, lineIndex) => {
                const lineTrimmed = line.trim();
                if (lineTrimmed.startsWith('## ')) {
                  return (
                    <h2 key={lineIndex} className="text-xl md:text-2xl font-semibold mt-4 first:mt-0">
                      {lineTrimmed.replace('## ', '')}
                    </h2>
                  );
                }
                return (
                  <p key={lineIndex} className="text-sm md:text-base text-muted-foreground">
                    {lineTrimmed}
                  </p>
                );
              })}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
