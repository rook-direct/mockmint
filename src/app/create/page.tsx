"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  Calculator,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  Zap,
  Target,
  Grid3X3,
} from "lucide-react";
import { getTopicInfos, getCategories, getCategoryLabel } from "@/lib/questions";
import { generatePaper, savePaper } from "@/lib/paper-generator";
import { useToast } from "@/components/Toast";
import type { TopicInfo } from "@/lib/types";

const STEPS = ["Configure", "Topics", "Generate"];

export default function CreatePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);

  // Config state
  const [tier, setTier] = useState<"foundation" | "higher">("foundation");
  const [calculator, setCalculator] = useState(true);
  const [targetMarks, setTargetMarks] = useState(80);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());

  // Compute available topics based on tier + calculator
  const topicInfos = useMemo(
    () => getTopicInfos({ tier, calculator }),
    [tier, calculator]
  );
  const categories = useMemo(() => getCategories(topicInfos), [topicInfos]);

  // Stats for selected topics
  const selectedStats = useMemo(() => {
    const selected = topicInfos.filter((t) => selectedTopics.has(t.topic));
    return {
      count: selected.reduce((sum, t) => sum + t.count, 0),
      marks: selected.reduce((sum, t) => sum + t.totalMarks, 0),
      topics: selected.length,
    };
  }, [topicInfos, selectedTopics]);

  function toggleTopic(topic: string) {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  }

  function selectAll() {
    setSelectedTopics(new Set(topicInfos.map((t) => t.topic)));
  }

  function deselectAll() {
    setSelectedTopics(new Set());
  }

  function handleGenerate() {
    if (selectedTopics.size === 0) {
      toast("Select at least one topic", "error");
      return;
    }

    const paper = generatePaper({
      tier,
      calculator,
      targetMarks,
      topics: [...selectedTopics],
    });

    if (paper.questions.length === 0) {
      toast("No questions found for this combination", "error");
      return;
    }

    savePaper(paper);
    toast(`Paper generated — ${paper.totalMarks} marks, ${paper.questions.length} questions`);
    router.push(`/paper/${paper.id}`);
  }

  // Heatmap color based on question count
  function heatColor(count: number): string {
    if (count === 0) return "bg-card-border/30";
    if (count < 10) return "bg-mint/20";
    if (count < 30) return "bg-mint/40";
    if (count < 60) return "bg-mint/60";
    return "bg-mint/80";
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* Step indicator */}
      <div className="mb-10 flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              className={clsx(
                "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                i === step
                  ? "bg-mint text-white"
                  : i < step
                  ? "bg-mint/10 text-mint cursor-pointer hover:bg-mint/20"
                  : "bg-card-bg text-muted"
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : null}
              {s}
            </button>
            {i < STEPS.length - 1 && (
              <ChevronRight className="h-4 w-4 text-muted" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Configuration */}
      {step === 0 && (
        <div className="animate-fade-up space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Configure Your Paper</h1>
            <p className="mt-2 text-muted">Set the basics, then choose your topics.</p>
          </div>

          {/* Tier */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted">Tier</label>
            <div className="grid grid-cols-2 gap-3">
              {(["foundation", "higher"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTier(t);
                    setSelectedTopics(new Set());
                  }}
                  className={clsx(
                    "flex items-center justify-center gap-2 rounded-xl border p-4 text-base font-medium transition-all",
                    tier === t
                      ? "border-mint bg-mint/10 text-mint"
                      : "border-card-border bg-card-bg text-muted hover:border-mint/30"
                  )}
                >
                  <BookOpen className="h-5 w-5" />
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Calculator */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted">Calculator</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: true, label: "Calculator", icon: Calculator },
                { val: false, label: "Non-calculator", icon: Zap },
              ].map((opt) => (
                <button
                  key={String(opt.val)}
                  onClick={() => {
                    setCalculator(opt.val);
                    setSelectedTopics(new Set());
                  }}
                  className={clsx(
                    "flex items-center justify-center gap-2 rounded-xl border p-4 text-base font-medium transition-all",
                    calculator === opt.val
                      ? "border-mint bg-mint/10 text-mint"
                      : "border-card-border bg-card-bg text-muted hover:border-mint/30"
                  )}
                >
                  <opt.icon className="h-5 w-5" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target marks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted">Target Marks</label>
              <span className="text-2xl font-bold text-mint">{targetMarks}</span>
            </div>
            <input
              type="range"
              min={40}
              max={100}
              value={targetMarks}
              onChange={(e) => setTargetMarks(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted">
              <span>40</span>
              <span>100</span>
            </div>
          </div>

          <button
            onClick={() => setStep(1)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-mint px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-mint/20 transition-all hover:bg-mint-dark"
          >
            Choose Topics
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 2: Topic Selection */}
      {step === 1 && (
        <div className="animate-fade-up space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Select Topics</h1>
            <p className="mt-2 text-muted">
              {tier.charAt(0).toUpperCase() + tier.slice(1)} •{" "}
              {calculator ? "Calculator" : "Non-calculator"} • Target: {targetMarks} marks
            </p>
          </div>

          {/* Progress bar */}
          <div className="rounded-xl border border-card-border bg-card-bg p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-mint" />
                <span>
                  <strong className="text-mint">{selectedStats.topics}</strong> topics ·{" "}
                  <strong className="text-mint">{selectedStats.count}</strong> questions available
                </span>
              </div>
              <span className="text-muted">
                ~{selectedStats.marks} marks in pool
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-card-border">
              <div
                className="h-full rounded-full bg-mint transition-all duration-300"
                style={{
                  width: `${Math.min((selectedStats.marks / targetMarks) * 100, 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Select all / deselect */}
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="rounded-lg border border-card-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-mint/30 hover:text-mint"
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="rounded-lg border border-card-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-mint/30 hover:text-mint"
            >
              Deselect All
            </button>
          </div>

          {/* Topic grid by category */}
          {categories.map((cat) => {
            const catTopics = topicInfos.filter((t) => t.category === cat);
            return (
              <div key={cat}>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted">
                  <Grid3X3 className="h-3.5 w-3.5" />
                  {getCategoryLabel(cat)}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {catTopics.map((t) => (
                    <TopicCard
                      key={t.topic}
                      topic={t}
                      selected={selectedTopics.has(t.topic)}
                      onToggle={() => toggleTopic(t.topic)}
                      heatColor={heatColor(t.count)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Nav buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(0)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-card-border px-6 py-3.5 text-base font-medium text-muted transition-all hover:border-mint/30"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={() => {
                if (selectedTopics.size === 0) {
                  toast("Select at least one topic", "error");
                  return;
                }
                setStep(2);
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-mint px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-mint/20 transition-all hover:bg-mint-dark"
            >
              Review
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Generate */}
      {step === 2 && (
        <div className="animate-fade-up space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Review & Generate</h1>
            <p className="mt-2 text-muted">Check your settings, then generate your paper.</p>
          </div>

          <div className="space-y-4 rounded-2xl border border-card-border bg-card-bg p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted">Tier</div>
                <div className="mt-1 text-lg font-semibold">
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted">Calculator</div>
                <div className="mt-1 text-lg font-semibold">
                  {calculator ? "Yes" : "No"}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted">Target Marks</div>
                <div className="mt-1 text-lg font-semibold text-mint">{targetMarks}</div>
              </div>
            </div>

            <hr className="border-card-border" />

            <div>
              <div className="text-xs uppercase tracking-wider text-muted mb-3">
                Selected Topics ({selectedTopics.size})
              </div>
              <div className="flex flex-wrap gap-2">
                {topicInfos
                  .filter((t) => selectedTopics.has(t.topic))
                  .map((t) => (
                    <span
                      key={t.topic}
                      className="rounded-lg bg-mint/10 px-3 py-1 text-sm text-mint"
                    >
                      {t.label}
                    </span>
                  ))}
              </div>
            </div>

            <hr className="border-card-border" />

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Available questions in pool</span>
              <span className="font-semibold">{selectedStats.count}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Total marks in pool</span>
              <span className="font-semibold">~{selectedStats.marks}</span>
            </div>
          </div>

          {/* Nav buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-card-border px-6 py-3.5 text-base font-medium text-muted transition-all hover:border-mint/30"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={handleGenerate}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-mint px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-mint/20 transition-all hover:bg-mint-dark"
            >
              <Sparkles className="h-4 w-4" />
              Generate Paper
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TopicCard({
  topic,
  selected,
  onToggle,
  heatColor,
}: {
  topic: TopicInfo;
  selected: boolean;
  onToggle: () => void;
  heatColor: string;
}) {
  return (
    <button
      onClick={onToggle}
      className={clsx(
        "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
        selected
          ? "border-mint bg-mint/5"
          : "border-card-border bg-card-bg hover:border-mint/20"
      )}
    >
      <div
        className={clsx(
          "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-all",
          selected
            ? "border-mint bg-mint text-white"
            : "border-card-border"
        )}
      >
        {selected && <Check className="h-3 w-3" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{topic.label}</div>
        <div className="text-xs text-muted">{topic.count} questions</div>
      </div>
      <div
        className={clsx("h-6 w-6 rounded-md", heatColor)}
        title={`${topic.count} questions`}
      />
    </button>
  );
}
