import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ThumbsDown, ThumbsUp } from "lucide-react";
import { kbDb } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

export default function KnowledgeArticlePage() {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const queryClient = useQueryClient();
  const [voted, setVoted] = useState<"helpful" | "not_helpful" | null>(null);

  const { data: article, isLoading } = useQuery({
    queryKey: ["kb-article", idOrSlug],
    queryFn: () => kbDb.getArticleBySlugOrId(idOrSlug!, true),
    enabled: !!idOrSlug,
  });

  const vote = useMutation({
    mutationFn: (helpful: boolean) => kbDb.voteArticle(article!.id, helpful),
    onSuccess: (_data, helpful) => {
      setVoted(helpful ? "helpful" : "not_helpful");
      queryClient.invalidateQueries({ queryKey: ["kb-article", idOrSlug] });
    },
  });

  if (isLoading || !article) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const tags = article.tagsCsv ? article.tagsCsv.split(",").filter(Boolean) : [];

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/knowledge-base" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Knowledge Base
      </Link>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{article.category.name}</Badge>
            {article.status === "draft" && <Badge variant="secondary">Draft</Badge>}
          </div>
          <h1 className="text-2xl font-bold text-foreground">{article.title}</h1>
          <p className="text-sm text-muted-foreground">
            By {article.author.firstName} {article.author.lastName} · Last updated {formatDate(article.updatedAt)} · {article.viewCount} views
          </p>

          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{article.content}</div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Badge key={t} variant="secondary">#{t}</Badge>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">Was this article helpful?</span>
            <Button size="sm" variant={voted === "helpful" ? "default" : "outline"} disabled={!!voted} onClick={() => vote.mutate(true)}>
              <ThumbsUp className="h-3.5 w-3.5" /> Yes ({article.helpfulCount})
            </Button>
            <Button size="sm" variant={voted === "not_helpful" ? "default" : "outline"} disabled={!!voted} onClick={() => vote.mutate(false)}>
              <ThumbsDown className="h-3.5 w-3.5" /> No ({article.notHelpfulCount})
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
