
'use server';
/**
 * @fileOverview This file implements a Genkit flow for analyzing student test results using AI.
 * It follows the official go2study report format: Topic, Error Type, Exam Influence, and Recommendation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeStudentResultInputSchema = z.object({
  studentName: z.string().describe("The student's name."),
  classNumber: z.number().describe("The student's class number."),
  percentage: z.number().describe("The student's overall percentage score."),
  totalCorrect: z.number().describe("The total number of correct answers."),
  totalQuestions: z.number().describe("The total number of questions in the test."),
  answers: z.array(z.object({
    questionNumber: z.number().describe("The question number."),
    subject: z.string().describe("The subject of the question."),
    questionText: z.string().describe("The full text of the question."),
    studentAnswer: z.string().nullable().describe("The answer provided by the student."),
    correctAnswer: z.string().describe("The correct answer for the question."),
    isCorrect: z.boolean().describe("Whether the student's answer was correct."),
    timeSpentSeconds: z.number().describe("Total time spent on this question in seconds."),
  })).describe("An array of student's answers (including skipped ones)."),
  antiCheatLogs: z.array(z.object({
    eventType: z.string().describe("Type of anti-cheat event."),
    questionNumber: z.number().describe("The question number."),
    exitDurationSeconds: z.number().describe("Duration of the event."),
    details: z.string().describe("Details."),
    createdAt: z.string().describe("Timestamp."),
  })).describe("Anti-cheat logs."),
});
export type AnalyzeStudentResultInput = z.infer<typeof AnalyzeStudentResultInputSchema>;

const DetailedErrorAnalysisSchema = z.object({
  questionNumber: z.number().describe("Number of the question."),
  subject: z.string().describe("Subject of the question."),
  topic: z.string().describe("Specific topic of the task (e.g., 'Поиск прямой информации в тексте')."),
  studentAnswer: z.string().nullable().describe("What the student chose."),
  correctAnswer: z.string().describe("The actual correct option."),
  status: z.string().describe("Status (e.g., 'Ошибка' or 'Пропуск')."),
  errorType: z.string().describe("Type of error identified (e.g., 'Невнимательность', 'Незнание правила', 'Дефицит времени')."),
  examInfluence: z.string().describe("How this specific topic/error affects the actual NISH exam performance."),
  recommendation: z.string().describe("Specific actionable recommendation for this question."),
});

const AnalyzeStudentResultOutputSchema = z.object({
  performanceSummary: z.string().describe("Overall summary of performance."),
  detailedAnalysis: z.array(DetailedErrorAnalysisSchema).describe("Question-by-question breakdown for incorrect/skipped answers."),
  learningPathwaySuggestions: z.array(z.object({
    area: z.string().describe("Subject area."),
    suggestion: z.string().describe("Personalized learning suggestion."),
    resources: z.array(z.string()).optional().describe("Suggested topics/resources."),
  })).describe("Strategic suggestions for improvement."),
  antiCheatBehaviorAnalysis: z.string().optional().describe("Analysis of anti-cheat logs."),
});
export type AnalyzeStudentResultOutput = z.infer<typeof AnalyzeStudentResultOutputSchema>;

export async function analyzeStudentResult(input: AnalyzeStudentResultInput): Promise<AnalyzeStudentResultOutput> {
  return analyzeStudentResultFlow(input);
}

const analyzeStudentResultPrompt = ai.definePrompt({
  name: 'analyzeStudentResultPrompt',
  input: {schema: AnalyzeStudentResultInputSchema},
  output: {schema: AnalyzeStudentResultOutputSchema},
  prompt: `You are an expert educational analyst for go2study, specializing in NISH (NIS) entrance exams.
Your task is to generate a professional analytical report based on a student's test data.

CRITICAL INSTRUCTIONS:
1. For EVERY incorrect or skipped answer, provide a detailed breakdown in 'detailedAnalysis'.
2. USE TIME DATA: Analyze 'timeSpentSeconds'. 
   - If time is very low (<10s) and answer is wrong, it's likely 'Inattention' (Невнимательность).
   - If time is very high (>120s) and answer is wrong, it's 'Conceptual Gap' (Незнание правила) or 'Overthinking'.
   - If 'studentAnswer' is null, status is 'Пропуск'.
3. 'topic': Be specific about the cognitive skill or academic topic.
4. 'errorType': Categorize why they failed (e.g., conceptual gap, logic error, time pressure, misreading).
5. 'examInfluence': Explain how often this topic appears in NISH exams and its weight.
6. 'recommendation': Provide a clear, pedagogical advice for the student.

Here is the student's test data:
Student: {{{studentName}}}, Class: {{{classNumber}}}, Score: {{{percentage}}}% ({{{totalCorrect}}}/{{{totalQuestions}}})

Answers:
{{#each answers}}
- Q{{questionNumber}} ({{subject}}): "{{{questionText}}}" 
  Student chose: "{{{studentAnswer}}}", Correct: "{{{correctAnswer}}}", IsCorrect: {{isCorrect}}, TimeSpent: {{timeSpentSeconds}}s
{{/each}}

Analyze the data and output a structured JSON report.`,
  config: {
    responseMimeType: 'application/json',
    model: 'googleai/gemini-1.5-flash',
  }
});

const analyzeStudentResultFlow = ai.defineFlow(
  {
    name: 'analyzeStudentResultFlow',
    inputSchema: AnalyzeStudentResultInputSchema,
    outputSchema: AnalyzeStudentResultOutputSchema,
  },
  async (input) => {
    const {output} = await analyzeStudentResultPrompt(input);
    return output!;
  }
);
