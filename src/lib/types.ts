export interface Question {
  id: string;
  source: string;
  board: string;
  year: number;
  session: string;
  paper: number;
  tier: "foundation" | "higher";
  calculator: boolean;
  question_number: number;
  marks: number;
  text: string;
  text_clean: string;
  subparts: string[];
  has_diagram: boolean;
  topic: string;
  content_hash: string;
  topic_category: string;
  topic_subtopic: string;
}

export interface PaperConfig {
  tier: "foundation" | "higher";
  calculator: boolean;
  targetMarks: number;
  topics: string[];
}

export interface GeneratedPaper {
  id: string;
  config: PaperConfig;
  questions: Question[];
  totalMarks: number;
  createdAt: string;
}

export interface TopicInfo {
  topic: string;
  category: string;
  subtopic: string;
  label: string;
  count: number;
  totalMarks: number;
}
