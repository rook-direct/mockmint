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

const TOPIC_NAMES: Record<string, string> = {
  "algebra.expressions": "Expressions & Simplifying",
  "algebra.equations_linear": "Linear Equations",
  "algebra.quadratic_equations": "Quadratic Equations",
  "algebra.quadratic_graphs": "Quadratic Graphs",
  "algebra.simultaneous_equations": "Simultaneous Equations",
  "algebra.inequalities": "Inequalities",
  "algebra.sequences": "Sequences (nth term)",
  "algebra.straight_line_graphs": "Straight Line Graphs",
  "algebra.proof": "Algebraic Proof",
  "algebra.rearranging": "Rearranging Formulae",
  "algebra.substitution": "Substitution",
  "algebra.indices": "Indices (Algebraic)",
  "algebra.graph_transformations": "Graph Transformations",
  "algebra.velocity_time_graphs": "Velocity-Time Graphs",
  "algebra.algebraic_fractions": "Algebraic Fractions",
  "algebra.functions": "Functions",
  "algebra.iteration": "Iteration",
  "number.percentages": "Percentages",
  "number.fractions": "Fractions",
  "number.factors_primes": "Factors, Multiples & Primes",
  "number.standard_form": "Standard Form",
  "number.surds": "Surds",
  "number.indices_powers": "Indices & Powers",
  "number.bounds": "Bounds & Error Intervals",
  "number.rounding_estimation": "Estimation & Rounding",
  "number.operations": "Number Operations",
  "ratio.ratio": "Ratio",
  "ratio.compound_measures": "Compound Measures",
  "ratio.growth_decay": "Growth & Decay",
  "ratio.proportion": "Proportion",
  "geometry.area_perimeter": "Area & Perimeter",
  "geometry.volume_surface_area": "Volume & Surface Area",
  "geometry.angles": "Angles & Polygons",
  "geometry.trigonometry": "Trigonometry (SOHCAHTOA)",
  "geometry.pythagoras": "Pythagoras' Theorem",
  "geometry.transformations": "Transformations",
  "geometry.constructions_loci": "Constructions & Loci",
  "geometry.bearings": "Bearings",
  "geometry.similar_shapes": "Similar Shapes & Congruence",
  "geometry.sine_cosine_rule": "Sine & Cosine Rules",
  "geometry.vectors": "Vectors",
  "geometry.circle_theorems": "Circle Theorems",
  "geometry.equation_of_circle": "Equation of a Circle",
  "probability.basic": "Basic Probability",
  "probability.combined": "Combined Probability",
  "probability.tree_diagrams": "Tree Diagrams",
  "probability.venn_diagrams": "Venn Diagrams (Probability)",
  "probability.conditional": "Conditional Probability",
  "statistics.averages": "Averages & Range",
  "statistics.data_representation": "Data Representation",
  "statistics.cumulative_frequency": "Cumulative Frequency",
  "statistics.histograms": "Histograms",
  "statistics.scatter_graphs": "Scatter Graphs",
  "statistics.sampling": "Sampling",
  "statistics.pie_charts": "Pie Charts",
  "statistics.frequency_polygons": "Frequency Polygons",
  "statistics.box_plots": "Box Plots",
};

export function formatTopicLabel(topic: string): string {
  if (TOPIC_NAMES[topic]) return TOPIC_NAMES[topic];
  const [, subtopic] = topic.split(".");
  if (!subtopic) return topic;
  return subtopic
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    algebra: "Algebra",
    number: "Number",
    ratio: "Ratio, Proportion & Rates of Change",
    geometry: "Geometry & Measures",
    probability: "Probability",
    statistics: "Statistics",
  };
  return labels[category] || category.charAt(0).toUpperCase() + category.slice(1);
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
