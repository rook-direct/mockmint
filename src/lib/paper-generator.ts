import { filterQuestions } from "./questions";
import { PaperConfig, Question, GeneratedPaper } from "./types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generatePaper(config: PaperConfig): GeneratedPaper {
  const { tier, calculator, topics, targetMarks } = config;

  // Get all available questions matching tier + calculator
  const available = filterQuestions({ tier, calculator, topics });

  if (available.length === 0) {
    return {
      id: crypto.randomUUID(),
      config,
      questions: [],
      totalMarks: 0,
      createdAt: new Date().toISOString(),
    };
  }

  // Group by topic
  const byTopic = new Map<string, Question[]>();
  for (const q of available) {
    const list = byTopic.get(q.topic) || [];
    list.push(q);
    byTopic.set(q.topic, list);
  }

  // Shuffle within each topic
  for (const [topic, qs] of byTopic) {
    byTopic.set(topic, shuffle(qs));
  }

  // Round-robin selection across topics to balance coverage
  const selected: Question[] = [];
  const usedIds = new Set<string>();
  let currentMarks = 0;
  const topicKeys = shuffle([...byTopic.keys()]);
  const topicPointers = new Map<string, number>();
  for (const t of topicKeys) topicPointers.set(t, 0);

  let passes = 0;
  const maxPasses = 50;

  while (currentMarks < targetMarks && passes < maxPasses) {
    let addedAny = false;

    for (const topic of topicKeys) {
      if (currentMarks >= targetMarks) break;

      const qs = byTopic.get(topic)!;
      let ptr = topicPointers.get(topic)!;

      // Find next unused question in this topic
      while (ptr < qs.length && usedIds.has(qs[ptr].id)) {
        ptr++;
      }

      if (ptr < qs.length) {
        const q = qs[ptr];
        // Don't overshoot by more than one large question
        if (currentMarks + q.marks <= targetMarks + 5) {
          selected.push(q);
          usedIds.add(q.id);
          currentMarks += q.marks;
          addedAny = true;
        }
        ptr++;
      }

      topicPointers.set(topic, ptr);
    }

    if (!addedAny) break;
    passes++;
  }

  // Sort: by difficulty (marks ascending), then by topic category for flow
  const sorted = selected.sort((a, b) => {
    if (a.marks !== b.marks) return a.marks - b.marks;
    return a.topic.localeCompare(b.topic);
  });

  return {
    id: crypto.randomUUID(),
    config,
    questions: sorted,
    totalMarks: sorted.reduce((sum, q) => sum + q.marks, 0),
    createdAt: new Date().toISOString(),
  };
}

export function savePaper(paper: GeneratedPaper): void {
  if (typeof window === "undefined") return;
  const papers = getSavedPapers();
  papers[paper.id] = paper;
  localStorage.setItem("mockmint-papers", JSON.stringify(papers));
}

export function getSavedPapers(): Record<string, GeneratedPaper> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("mockmint-papers");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getPaper(id: string): GeneratedPaper | null {
  const papers = getSavedPapers();
  return papers[id] || null;
}
