import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DynamicPageContentProps {
  content: string;
  isLoading?: boolean;
}

export function DynamicPageContent({ content, isLoading }: DynamicPageContentProps) {
  if (isLoading) {
    return (
      <Card className="glass-effect border-border/30 shadow-elegant">
        <CardContent className="p-6 md:p-10 space-y-6">
          <Skeleton className="h-7 w-1/3 bg-secondary/50" />
          <Skeleton className="h-4 w-full bg-secondary/40" />
          <Skeleton className="h-4 w-full bg-secondary/40" />
          <Skeleton className="h-4 w-2/3 bg-secondary/40" />
          <Skeleton className="h-7 w-1/4 mt-6 bg-secondary/50" />
          <Skeleton className="h-4 w-full bg-secondary/40" />
          <Skeleton className="h-4 w-3/4 bg-secondary/40" />
        </CardContent>
      </Card>
    );
  }

  // Parse content: ## creates section headers, paragraphs separated by \n\n
  const sections = content.split('\n\n').filter(Boolean);

  return (
    <Card className="glass-effect border-border/30 shadow-elegant overflow-hidden">
      <CardContent className="p-6 md:p-10 space-y-6 md:space-y-8">
        {sections.map((section, index) => {
          const trimmed = section.trim();
          
          // Check if it's a heading (starts with ##)
          if (trimmed.startsWith('## ')) {
            const headingText = trimmed.replace('## ', '');
            return (
              <h2 
                key={index} 
                className="text-xl md:text-2xl font-semibold text-gradient-silver mt-8 first:mt-0 pb-2 border-b border-primary/20"
              >
                {headingText}
              </h2>
            );
          }
          
          // Regular paragraph - handle single line breaks within paragraphs
          const lines = trimmed.split('\n');
          return (
            <div key={index} className="space-y-3">
              {lines.map((line, lineIndex) => {
                const lineTrimmed = line.trim();
                if (lineTrimmed.startsWith('## ')) {
                  return (
                    <h2 
                      key={lineIndex} 
                      className="text-xl md:text-2xl font-semibold text-gradient-silver mt-8 first:mt-0 pb-2 border-b border-primary/20"
                    >
                      {lineTrimmed.replace('## ', '')}
                    </h2>
                  );
                }
                return (
                  <p key={lineIndex} className="text-sm md:text-base text-foreground/80 leading-relaxed">
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
