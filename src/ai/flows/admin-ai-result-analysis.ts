'use server';
/**
 * @fileOverview This file implements a Genkit flow for analyzing student test results using AI.
 * It takes a student's performance data, answers, and anti-cheat logs, and generates a structured
 * AI analysis including performance summary, error patterns, and personalized learning suggestions.
 *
 * - analyzeStudentResult - A function that triggers the AI analysis of a student's test result.
 * - AnalyzeStudentResultInput - The input type for the analyzeStudentResult function.
 * - AnalyzeStudentResultOutput - The return type for the analyzeStudentResult function.
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
    subject: z.string().describe("The subject of the question (e.g., 'math', 'logic')."),
    questionText: z.string().describe("The full text of the question."),
    optionA: z.string().optional().describe("Option A for the question (if multiple choice)."),
    optionB: z.string().optional().describe("Option B for the question (if multiple choice)."),
    optionC: z.string().optional().describe("Option C for the question (if multiple choice)."),
    optionD: z.string().optional().describe("Option D for the question (if multiple choice)."),
    optionE: z.string().nullable().optional().describe("Option E for the question (if multiple choice)."),
    studentAnswer: z.string().nullable().describe("The answer provided by the student."),
    correctAnswer: z.string().describe("The correct answer for the question."),
    isCorrect: z.boolean().describe("Whether the student's answer was correct."),
    timeSpentSeconds: z.number().describe("Time spent on this question in seconds."),
  })).describe("An array of student's answers with detailed question and answer information."),
  antiCheatLogs: z.array(z.object({
    eventType: z.string().describe("Type of anti-cheat event (e.g., 'tab_switch', 'window_blur')."),
    questionNumber: z.number().describe("The question number during which the event occurred."),
    exitDurationSeconds: z.number().describe("Duration of the exit/blur event in seconds."),
    details: z.string().describe("Additional details about the anti-cheat event."),
    createdAt: z.string().describe("Timestamp of the event creation (ISO string format)."),
  })).describe("An array of anti-cheat logs for the student's test."),
});
export type AnalyzeStudentResultInput = z.infer<typeof AnalyzeStudentResultInputSchema>;

const AnalyzeStudentResultOutputSchema = z.object({
  performanceSummary: z.string().describe("A comprehensive summary of the student's overall performance, highlighting strengths and weaknesses."),
  errorPatterns: z.array(z.object({
    subject: z.string().describe("The subject area where specific error patterns were identified."),
    incorrectAnswers: z.array(z.object({
      questionNumber: z.number().describe("The number of the question that was answered incorrectly."),
      questionText: z.string().describe("The full text of the incorrectly answered question."),
      studentAnswer: z.string().nullable().describe("The answer provided by the student for this question."),
      correctAnswer: z.string().describe("The correct answer for this question."),
      feedback: z.string().describe("Detailed feedback specific to why this answer was incorrect and how to approach it correctly."),
    })).describe("Details of individual incorrect answers within this subject, including specific feedback."),
    analysis: z.string().describe("A general analysis of the common error patterns observed in this subject."),
  })).describe("Detailed patterns in student's errors, grouped by subject, with specific feedback for each incorrect answer."),
  learningPathwaySuggestions: z.array(z.object({
    area: z.string().describe("The specific academic area or subject for which the learning suggestion is provided."),
    suggestion: z.string().describe("A personalized and actionable learning suggestion to improve performance in the specified area."),
    resources: z.array(z.string()).optional().describe("Optional: List of suggested resources (e.g., topics, types of exercises) for this learning suggestion."),
  })).describe("Personalized learning pathway suggestions based on the analysis, with optional resources."),
  antiCheatBehaviorAnalysis: z.string().optional().describe("An analysis of potential anti-cheat behavior based on the provided logs, including observed events and their implications. State clearly if no suspicious behavior was detected."),
});
export type AnalyzeStudentResultOutput = z.infer<typeof AnalyzeStudentResultOutputSchema>;

export async function analyzeStudentResult(input: AnalyzeStudentResultInput): Promise<AnalyzeStudentResultOutput> {
  return analyzeStudentResultFlow(input);
}

const analyzeStudentResultPrompt = ai.definePrompt({
  name: 'analyzeStudentResultPrompt',
  input: {schema: AnalyzeStudentResultInputSchema},
  output: {schema: AnalyzeStudentResultOutputSchema},
  prompt: `You are an expert educational assistant designed to analyze student test results and provide comprehensive feedback.
Your goal is to generate a JSON object containing a performance summary, detailed error patterns with feedback, personalized learning pathway suggestions, and an analysis of any observed anti-cheat behavior.

Here is the student's test data:
Student Name: {{{studentName}}}
Class Number: {{{classNumber}}}
Overall Percentage: {{{percentage}}}%
Total Correct Answers: {{{totalCorrect}}} out of {{{totalQuestions}}}

Student Answers and Performance:
{{#each answers}}
- Question {{questionNumber}} (Subject: {{subject}}):
  Question Text: {{{questionText}}}
  {{#if optionA}}Option A: {{{optionA}}}{{/if}}
  {{#if optionB}}Option B: {{{optionB}}}{{/if}}
  {{#if optionC}}Option C: {{{optionC}}}{{/if}}
  {{#if optionD}}Option D: {{{optionD}}}{{/if}}
  {{#if optionE}}Option E: {{{optionE}}}{{/if}}
  Student's Answer: "{{{studentAnswer}}}"
  Correct Answer: "{{{correctAnswer}}}"
  Is Correct: {{isCorrect}}
  Time Spent: {{timeSpentSeconds}} seconds
{{/each}}

Anti-cheat Logs:
{{#if antiCheatLogs}}
{{#each antiCheatLogs}}
- Event Type: {{{eventType}}}, Question: {{questionNumber}}, Exit Duration: {{exitDurationSeconds}}s, Details: "{{{details}}}", Created At: {{{createdAt}}}
{{/each}}
{{else}}
No anti-cheat logs available.
{{/if}}

Please analyze the provided data and generate a JSON output that adheres strictly to the following structure:
- 'performanceSummary': A string providing an overall summary of the student's performance, highlighting strengths (e.g., subjects performed well in) and weaknesses (e.g., areas needing improvement).
- 'errorPatterns': An array of objects.
  - Each object should represent a subject where errors were identified.
  - It should contain 'subject' (string), 'incorrectAnswers' (an array of objects), and 'analysis' (string).
  - Each 'incorrectAnswers' object should have 'questionNumber' (number), 'questionText' (string), 'studentAnswer' (string, can be null), 'correctAnswer' (string), and 'feedback' (string). The feedback should be specific to the question and student's answer, explaining why it was wrong and how to think about it correctly.
  - The 'analysis' field for each subject should describe common patterns observed in incorrect answers for that subject.
- 'learningPathwaySuggestions': An array of objects.
  - Each object should have 'area' (string) and 'suggestion' (string).
  - 'suggestion' should be a personalized and actionable recommendation for improvement based on the identified error patterns.
  - Optionally, include a 'resources' array of strings for suggested topics or exercise types.
- 'antiCheatBehaviorAnalysis': An optional string. Analyze the anti-cheat logs. If there are logs, describe any suspicious behavior detected (e.g., frequent tab switches, long window blurs during crucial questions) and its potential implications. If no logs or no suspicious activity, state that no concerning anti-cheat behavior was detected.

Ensure the output is a single, valid JSON object. Do not include any other text or formatting outside the JSON.`,
  config: {
    responseMimeType: 'application/json',
    model: 'googleai/gemini-2.5-flash',
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
