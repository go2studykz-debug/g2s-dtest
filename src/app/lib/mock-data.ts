
import { Test, Question } from './types';

export const MOCK_TESTS: Test[] = [
  {
    id: 'test-1',
    name: 'Advanced Math & Logic Diagnostic',
    class_number: 9,
    language: 'ru',
    is_active: true,
    created_at: new Date('2024-01-01'),
  },
  {
    id: 'test-2',
    name: 'English Proficiency Level B2',
    class_number: 11,
    language: 'ru',
    is_active: true,
    created_at: new Date('2024-02-15'),
  }
];

export const MOCK_QUESTIONS: Record<string, Question[]> = {
  'test-1': [
    {
      id: 'q1',
      test_id: 'test-1',
      question_number: 1,
      subject: 'math',
      question_text: 'Solve for x: 2x + 5 = 15',
      option_a: '3',
      option_b: '5',
      option_c: '10',
      option_d: '7',
      option_e: '4',
      correct_answer: 'B'
    },
    {
      id: 'q2',
      test_id: 'test-1',
      question_number: 2,
      subject: 'logic',
      question_text: 'Which number comes next in the sequence: 2, 4, 8, 16, ...?',
      option_a: '24',
      option_b: '30',
      option_c: '32',
      option_d: '64',
      option_e: '48',
      correct_answer: 'C'
    },
    {
      id: 'q3',
      test_id: 'test-1',
      question_number: 3,
      subject: 'math',
      question_text: 'What is the square root of 144?',
      option_a: '10',
      option_b: '12',
      option_c: '14',
      option_d: '16',
      option_e: '11',
      correct_answer: 'B'
    }
  ]
};
