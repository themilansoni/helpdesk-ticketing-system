import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookOpen, Eye, PlusCircle, Search } from "lucide-react";
import { kbDb, referenceDb } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/firebase-errors";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { debounce } from "@/lib/utils";

const ALL = "__all__";
const PAGE_SIZE = 9;

export default function KnowledgeBaseListPage() {
  const { can, user } = useAuth();
  const canManage = can("KNOWLEDGE_MANAGE");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState(ALL);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["kb-categories"],
    queryFn: () => referenceDb.listKnowledgeCategories(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["kb-articles", search, categoryId, page, can("KNOWLEDGE_MANAGE")],
    queryFn: () =>
      kbDb.listArticles({
        search: search || undefined,
        categoryId: categoryId === ALL ? undefined : categoryId,
        includeDrafts: user?.role.name !== "Employee",
        page,
        pageSize: PAGE_SIZE,
      }),
    enabled: !!user,
  });

  const debouncedSearch = debounce((v: string) => {
    setSearch(v);
    setPage(1);
  }, 300);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [error, setError] = useState<string | null>(null);

  const createArticle = useMutation({
    mutationFn: () =>
      kbDb.createArticle(
        {
          title,
          content,
          categoryId: newCategoryId,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          status,
        },
        user!.id,
        { firstName: user!.firstName, lastName: user!.lastName }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-articles"] });
      toast({ title: "Article created" });
      setCreateOpen(false);
      setTitle("");
      setContent("");
      setNewCategoryId("");
      setTags("");
      setStatus("draft");
    },
    onError: (err) => setError(getErrorMessage(err, "Unable to create article.")),
  });

  return (
    <div>
      <PageHeader
        title="Knowledge Base"
        description="Self-service articles and how-to guides."
        actions={
          canManage ? (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusCircle className="h-4 w-4" /> New Article
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search articles..." className="pl-8" onChange={(e) => debouncedSearch(e.target.value)} />
        </div>
        <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setPage(1); }}>
          <SelectTrigger className="w-48" aria-label="Category"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState icon={BookOpen} title="No articles found" description="Try a different search term or category." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map((a) => (
              <Link key={a.id} to={`/knowledge-base/${a.slug}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="flex h-full flex-col gap-2 p-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{a.category.name}</Badge>
                      {a.status === "draft" && <Badge variant="secondary">Draft</Badge>}
                    </div>
                    <h3 className="font-semibold leading-snug">{a.title}</h3>
                    <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">{a.content}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>By {a.author.firstName} {a.author.lastName}</span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {a.viewCount}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-border bg-card">
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
          </div>
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Knowledge Base Article</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                  <SelectTrigger aria-label="Category"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "published")}>
                  <SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tags (comma separated)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="password, login, account" />
            </div>
            <div className="space-y-1.5">
              <Label>Content</Label>
              <Textarea rows={8} value={content} onChange={(e) => setContent(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              disabled={!title || !content || !newCategoryId || createArticle.isPending}
              onClick={() => createArticle.mutate()}
            >
              {createArticle.isPending ? "Saving..." : "Save Article"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
