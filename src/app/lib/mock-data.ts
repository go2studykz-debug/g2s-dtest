
import { Test, Question } from './types';

export const MOCK_TESTS: Test[] = [
  {
    id: 'test-1',
    name: 'Вступительная диагностика НИШ (Математика и Логика)',
    class_number: 6,
    language: 'ru',
    is_active: true,
    total_time_minutes: 60,
    blocks: [
      { subject: 'math', question_count: 15, time_limit_minutes: 30 },
      { subject: 'logic', question_count: 10, time_limit_minutes: 30 }
    ],
    created_at: new Date('2024-01-01'),
  },
  {
    id: 'test-2',
    name: 'Диагностика Английского Языка B2',
    class_number: 6,
    language: 'ru',
    is_active: true,
    total_time_minutes: 45,
    blocks: [
      { subject: 'english', question_count: 20, time_limit_minutes: 45 }
    ],
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
      question_text: 'Решите уравнение: 2x + 5 = 15',
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
      question_text: 'Какое число следующее в последовательности: 2, 4, 8, 16, ...?',
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
      question_text: 'Чему равен корень из 144?',
      option_a: '10',
      option_b: '12',
      option_c: '14',
      option_d: '16',
      option_e: '11',
      correct_answer: 'B'
    }
  ]
};
