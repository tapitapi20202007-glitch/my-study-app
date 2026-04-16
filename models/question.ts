export interface Question {
  questionId: string;
  mainQuestion: string;
  subQuestion: string;
  answer: string;
  explanation: string;
  createdAt: number;
  wrongCount: number;
}