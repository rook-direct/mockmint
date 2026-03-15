"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Printer, ArrowLeft, Leaf } from "lucide-react";
import { getPaper } from "@/lib/paper-generator";
import type { GeneratedPaper } from "@/lib/types";

export default function PaperPage() {
  const params = useParams();
  const router = useRouter();
  const [paper, setPaper] = useState<GeneratedPaper | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id as string;
    const found = getPaper(id);
    setPaper(found);
    setLoading(false);
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-mint border-t-transparent" />
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Paper not found</h1>
        <p className="mt-2 text-muted">This paper may have been cleared from your browser.</p>
        <button
          onClick={() => router.push("/create")}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-mint px-6 py-3 text-white font-semibold"
        >
          Create a New Paper
        </button>
      </div>
    );
  }

  // Build topic index
  const topicIndex = new Map<string, number[]>();
  paper.questions.forEach((q, i) => {
    const label = formatTopic(q.topic);
    const list = topicIndex.get(label) || [];
    list.push(i + 1);
    topicIndex.set(label, list);
  });

  return (
    <div>
      {/* Toolbar - no print */}
      <div className="no-print sticky top-[57px] z-40 border-b border-card-border bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push("/create")}
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Create Another
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg bg-mint px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-mint-dark"
            >
              <Printer className="h-4 w-4" />
              Print / PDF
            </button>
          </div>
        </div>
      </div>

      {/* Paper content */}
      <div className="paper-container mx-auto max-w-3xl px-4 py-8 sm:px-8">
        {/* Paper header */}
        <div className="mb-8 rounded-xl border border-card-border p-6 sm:p-8 print:border print:border-gray-300 print:rounded-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-mint print:text-gray-600" />
              <span className="text-lg font-bold">
                Mock<span className="text-mint print:text-gray-600">Mint</span>
              </span>
            </div>
            <span className="text-xs text-muted">Practice Paper</span>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold sm:text-3xl">GCSE Mathematics</h1>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-sm text-muted">
              <span className="rounded-full border border-card-border px-3 py-0.5 print:border-gray-300">
                {paper.config.tier.charAt(0).toUpperCase() + paper.config.tier.slice(1)} Tier
              </span>
              <span className="rounded-full border border-card-border px-3 py-0.5 print:border-gray-300">
                {paper.config.calculator ? "Calculator" : "Non-Calculator"}
              </span>
              <span className="rounded-full border border-card-border px-3 py-0.5 print:border-gray-300">
                {paper.totalMarks} marks
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border border-card-border p-3 print:border-gray-300">
              <span className="text-xs text-muted">Name:</span>
              <div className="mt-1 border-b border-card-border print:border-gray-300 pb-2" />
            </div>
            <div className="rounded-lg border border-card-border p-3 print:border-gray-300">
              <span className="text-xs text-muted">Class:</span>
              <div className="mt-1 border-b border-card-border print:border-gray-300 pb-2" />
            </div>
          </div>

          <div className="mt-6 text-xs text-muted space-y-1">
            <p>• Answer <strong>all</strong> questions.</p>
            <p>• Write your answers in the spaces provided.</p>
            <p>• You must show all your working.</p>
            {paper.config.calculator ? (
              <p>• Calculators <strong>may</strong> be used.</p>
            ) : (
              <p>• Calculators must <strong>not</strong> be used.</p>
            )}
            <p>• Diagrams are NOT accurately drawn, unless otherwise indicated.</p>
          </div>
        </div>

        {/* Topic index */}
        <div className="mb-8 rounded-xl border border-card-border p-6 print:border print:border-gray-300 print:rounded-none">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
            Topic Index
          </h2>
          <div className="grid gap-1.5 text-sm sm:grid-cols-2">
            {[...topicIndex.entries()].map(([topic, qNums]) => (
              <div key={topic} className="flex items-center justify-between gap-2 py-0.5">
                <span className="truncate">{topic}</span>
                <span className="text-xs text-muted flex-shrink-0">
                  Q{qNums.join(", Q")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {paper.questions.map((q, i) => (
            <div
              key={q.id}
              className="rounded-xl border border-card-border p-6 print:border print:border-gray-300 print:rounded-none print:break-inside-avoid"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mint/10 text-sm font-bold text-mint print:bg-gray-100 print:text-gray-700">
                      {i + 1}
                    </span>
                    <span className="text-xs text-muted">
                      {formatTopic(q.topic)}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed print:text-[11pt]">
                    {cleanQuestionText(q.text_clean || q.text, q.question_number)}
                  </div>
                </div>
                <div className="flex-shrink-0 rounded-lg bg-card-bg px-3 py-1.5 text-xs font-semibold text-muted print:bg-gray-100">
                  [{q.marks} {q.marks === 1 ? "mark" : "marks"}]
                </div>
              </div>

              {/* Answer space */}
              <div className="mt-4 border-t border-dashed border-card-border pt-4 print:border-gray-300">
                <div className="text-xs text-muted italic">Answer:</div>
                <div className="mt-8 print:mt-16" />
              </div>

              {/* Source attribution */}
              <div className="mt-2 text-right text-[10px] text-muted/50 print:text-gray-400">
                {q.source}
              </div>
            </div>
          ))}
        </div>

        {/* End of paper */}
        <div className="mt-12 text-center">
          <div className="inline-block rounded-xl border border-card-border px-8 py-4 print:border-gray-300">
            <p className="text-sm font-semibold">END OF QUESTIONS</p>
            <p className="mt-1 text-xs text-muted">
              Total: {paper.totalMarks} marks • {paper.questions.length} questions
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-muted print:text-gray-400">
          Generated by MockMint •{" "}
          {new Date(paper.createdAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
      </div>
    </div>
  );
}

function formatTopic(topic: string): string {
  const parts = topic.split(".");
  if (parts.length < 2) return topic;
  return parts[1]
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function cleanQuestionText(text: string, questionNumber: number): string {
  // Remove leading question number if present
  let cleaned = text.trim();
  const numPrefix = new RegExp(`^${questionNumber}\\s+`);
  cleaned = cleaned.replace(numPrefix, "");
  // Remove "DO NOT WRITE IN THIS AREA" artifacts
  cleaned = cleaned.replace(/\bDO\s*\nNOT\s*\nWRITE\s*\nIN\s*\nTHIS\s*\nAREA\b/gi, "");
  cleaned = cleaned.replace(/\bAERA\s*\nSIHT\s*\nNI\s*\nETIRW\s*\nTON\s*\nOD\b/gi, "");
  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  return cleaned.trim();
}
