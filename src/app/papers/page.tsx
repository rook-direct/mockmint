"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  RefreshCw,
  Trash2,
  Calculator,
  Zap,
  Clock,
  Target,
} from "lucide-react";
import { formatTopicLabel } from "@/lib/questions";
import { useToast } from "@/components/Toast";

interface PaperMeta {
  id: string;
  tier: string;
  calculator: boolean;
  targetMarks: number;
  topics: string[];
  actualMarks: number;
  questionCount: number;
  createdAt: string;
}

function loadPapers(): PaperMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("mockmint-papers-v2");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function removePaper(id: string) {
  if (typeof window === "undefined") return;
  try {
    const papers = loadPapers().filter((p) => p.id !== id);
    localStorage.setItem("mockmint-papers-v2", JSON.stringify(papers));
  } catch {
    // ignore
  }
}

export default function PapersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [papers, setPapers] = useState<PaperMeta[]>([]);

  useEffect(() => {
    setPapers(loadPapers());
  }, []);

  function handleRegenerate(paper: PaperMeta) {
    // Navigate to create page — we'll use query params to pre-fill
    const params = new URLSearchParams({
      tier: paper.tier,
      calculator: String(paper.calculator),
      targetMarks: String(paper.targetMarks),
      topics: paper.topics.join(","),
    });
    router.push(`/create?${params.toString()}`);
  }

  function handleDelete(id: string) {
    removePaper(id);
    setPapers(loadPapers());
    toast("Paper removed from history");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Paper History</h1>
        <p className="mt-2 text-muted">
          Previously generated papers. Regenerate with the same config or a new seed.
        </p>
      </div>

      {papers.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="mx-auto h-12 w-12 text-muted/30" />
          <h2 className="mt-4 text-lg font-semibold text-muted">No papers yet</h2>
          <p className="mt-1 text-sm text-muted">
            Generated papers will appear here.
          </p>
          <button
            onClick={() => router.push("/create")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-mint px-6 py-3 text-white font-semibold transition-all hover:bg-mint-dark"
          >
            Create Your First Paper
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {papers.map((paper) => (
            <div
              key={paper.id}
              className="rounded-2xl border border-card-border bg-card-bg p-5 transition-all hover:border-mint/20"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Header row */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      {paper.calculator ? (
                        <Calculator className="h-4 w-4 text-mint" />
                      ) : (
                        <Zap className="h-4 w-4 text-amber-400" />
                      )}
                      {paper.tier.charAt(0).toUpperCase() + paper.tier.slice(1)} •{" "}
                      {paper.calculator ? "Calculator" : "Non-Calculator"}
                    </div>
                    <span className="text-xs text-muted flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(paper.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-3 text-sm">
                    <span className="flex items-center gap-1 text-mint font-semibold">
                      <Target className="h-3.5 w-3.5" />
                      {paper.actualMarks || paper.targetMarks} marks
                    </span>
                    <span className="text-muted">
                      {paper.questionCount || "?"} questions
                    </span>
                  </div>

                  {/* Topics */}
                  <div className="flex flex-wrap gap-1.5">
                    {paper.topics.slice(0, 8).map((topic) => (
                      <span
                        key={topic}
                        className="rounded-md bg-mint/8 px-2 py-0.5 text-xs text-mint/80"
                      >
                        {formatTopicLabel(topic)}
                      </span>
                    ))}
                    {paper.topics.length > 8 && (
                      <span className="rounded-md bg-card-border/50 px-2 py-0.5 text-xs text-muted">
                        +{paper.topics.length - 8} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleRegenerate(paper)}
                    className="flex items-center gap-1.5 rounded-lg bg-mint/10 px-3 py-2 text-xs font-medium text-mint transition-colors hover:bg-mint/20"
                    title="Regenerate with same config"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Regenerate
                  </button>
                  <button
                    onClick={() => handleDelete(paper.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
                    title="Remove from history"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
