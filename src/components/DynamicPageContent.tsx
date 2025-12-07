import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DynamicPageContentProps {
  content: string;
  isLoading?: boolean;
}

export function DynamicPageContent({ content, isLoading }: DynamicPageContentProps) {
  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
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

  // Parse content: ## at the START of a line creates section headers
  const lines = content.split('\n');
  const elements: { type: 'heading' | 'paragraph'; text: string }[] = [];
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      elements.push({ type: 'paragraph', text: currentParagraph.join(' ') });
      currentParagraph = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('## ')) {
      flushParagraph();
      elements.push({ type: 'heading', text: trimmed.replace('## ', '') });
    } else if (trimmed === '') {
      flushParagraph();
    } else {
      currentParagraph.push(trimmed);
    }
  }
  flushParagraph();

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-6 md:p-8 space-y-4 md:space-y-5">
        {elements.map((element, index) => {
          if (element.type === 'heading') {
            return (
              <h2 key={index} className="text-lg md:text-xl font-semibold text-foreground mt-4 first:mt-0">
                {element.text}
              </h2>
            );
          }
          return (
            <p key={index} className="text-sm md:text-base text-muted-foreground leading-relaxed">
              {element.text}
            </p>
          );
        })}
      </CardContent>
    </Card>
  );
}
