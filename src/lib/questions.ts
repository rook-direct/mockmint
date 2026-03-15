import questionsData from "@/data/questions.json";
import { Question, TopicInfo } from "./types";

const allQuestions = questionsData as Question[];

export function getAllQuestions(): Question[] {
  return allQuestions;
}

export function getQuestionCount(): number {
  return allQuestions.length;
}

export function filterQuestions(opts: {
  tier?: "foundation" | "higher";
  calculator?: boolean;
  topics?: string[];
}): Question[] {
  return allQuestions.filter((q) => {
    if (opts.tier && q.tier !== opts.tier) return false;
    if (opts.calculator !== undefined && q.calculator !== opts.calculator) return false;
    if (opts.topics && opts.topics.length > 0 && !opts.topics.includes(q.topic)) return false;
    return true;
  });
}

function formatTopicLabel(topic: string): string {
  const [, subtopic] = topic.split(".");
  if (!subtopic) return topic;
  return subtopic
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatCategoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function getTopicInfos(opts?: {
  tier?: "foundation" | "higher";
  calculator?: boolean;
}): TopicInfo[] {
  const filtered = opts ? filterQuestions(opts) : allQuestions;
  const map = new Map<string, TopicInfo>();

  for (const q of filtered) {
    const existing = map.get(q.topic);
    if (existing) {
      existing.count++;
      existing.totalMarks += q.marks;
    } else {
      map.set(q.topic, {
        topic: q.topic,
        category: q.topic_category || q.topic.split(".")[0],
        subtopic: q.topic_subtopic || q.topic.split(".")[1] || "",
        label: formatTopicLabel(q.topic),
        count: 1,
        totalMarks: q.marks,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.label.localeCompare(b.label);
  });
}

export function getCategories(topicInfos: TopicInfo[]): string[] {
  return [...new Set(topicInfos.map((t) => t.category))].sort();
}

export function getCategoryLabel(category: string): string {
  return formatCategoryLabel(category);
}
