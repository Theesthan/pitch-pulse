import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Edit3, Check, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditableSectionProps {
  title: string;
  content: string;
  placeholder?: string;
  onChange: (content: string) => void;
  onGenerateAI?: () => Promise<string>;
  isGenerating?: boolean;
  className?: string;
  minHeight?: string;
}

export function EditableSection({
  title,
  content,
  placeholder = 'Enter content here...',
  onChange,
  onGenerateAI,
  isGenerating = false,
  className,
  minHeight = 'min-h-[120px]',
}: EditableSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);

  const handleSave = useCallback(() => {
    onChange(editValue);
    setIsEditing(false);
  }, [editValue, onChange]);

  const handleCancel = useCallback(() => {
    setEditValue(content);
    setIsEditing(false);
  }, [content]);

  const handleGenerateAI = useCallback(async () => {
    if (!onGenerateAI) return;
    const generated = await onGenerateAI();
    setEditValue(generated);
    onChange(generated);
  }, [onGenerateAI, onChange]);

  return (
    <Card className={cn("glass-card", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="flex items-center gap-2">
          {onGenerateAI && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateAI}
              disabled={isGenerating}
              className="text-primary hover:text-primary"
            >
              <Sparkles className={cn("mr-1 h-4 w-4", isGenerating && "animate-pulse")} />
              {isGenerating ? 'Generating...' : 'AI Generate'}
            </Button>
          )}
          {isEditing ? (
            <>
              <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8 text-muted-foreground">
                <X className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8 text-success">
                <Check className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsEditing(true)} 
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={placeholder}
            className={cn("resize-none bg-background/50", minHeight)}
            autoFocus
          />
        ) : (
          <div className={cn(
            "rounded-md text-sm leading-relaxed text-foreground/90",
            !content && "italic text-muted-foreground"
          )}>
            {content ? (
              content.split('\n').map((paragraph, i) => (
                <p key={i} className={i > 0 ? 'mt-3' : ''}>
                  {paragraph}
                </p>
              ))
            ) : (
              placeholder
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
