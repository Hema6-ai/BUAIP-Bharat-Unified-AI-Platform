"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

interface StudentProfile {
  academicStream: 'science_pcm' | 'science_pcb' | 'commerce' | 'arts' | 'diploma' | 'in_college' | 'working';
  interests: string[];
  academicSituation: 'top' | 'above_average' | 'average' | 'below_average' | 'marks_dont_define';
  familyIncome: 'below_2_5L' | '2_5L_to_8L' | '8L_to_20L' | 'above_20L';
  location: 'metro' | 'tier2' | 'small_town' | 'rural' | 'willing_to_relocate';
  constraints: string[];
  careerPriorities: string[];
  existingAchievements: string[];
}

interface PathAIIntakeFlowProps {
  onComplete: (profile: StudentProfile) => void;
  onCancel?: () => void;
}

// ============================================================================
// QUESTION DATA
// ============================================================================

const QUESTIONS = [
  {
    id: 'academicStream',
    question: 'Q1 — What is your academic stream?',
    type: 'single',
    options: [
      { value: 'science_pcm', label: 'Science PCM' },
      { value: 'science_pcb', label: 'Science PCB' },
      { value: 'commerce', label: 'Commerce' },
      { value: 'arts', label: 'Arts / Humanities' },
      { value: 'diploma', label: 'Diploma / Vocational' },
      { value: 'in_college', label: 'Already in College' },
      { value: 'working', label: 'Already Working' },
    ],
  },
  {
    id: 'interests',
    question: 'Q2 — What genuinely interests you? (Select all that apply)',
    type: 'multiple',
    options: [
      { value: 'technology', label: 'Technology' },
      { value: 'math_logic', label: 'Math / Logic' },
      { value: 'design_art', label: 'Design / Art' },
      { value: 'sales_persuasion', label: 'Sales / Persuasion' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'law_justice', label: 'Law / Justice' },
      { value: 'data_analysis', label: 'Data Analysis' },
      { value: 'nature_environment', label: 'Nature / Environment' },
      { value: 'teaching', label: 'Teaching' },
      { value: 'business_finance', label: 'Business / Finance' },
      { value: 'media_storytelling', label: 'Media / Storytelling' },
      { value: 'mechanical_building', label: 'Mechanical Building' },
    ],
  },
  {
    id: 'academicSituation',
    question: 'Q3 — How do you perform academically?',
    type: 'single',
    options: [
      { value: 'top', label: 'Top of class (90+)' },
      { value: 'above_average', label: 'Above average (75–90)' },
      { value: 'average', label: 'Average (60–75)' },
      { value: 'below_average', label: 'Below average (<60)' },
      { value: 'marks_dont_define', label: "Marks don't define me" },
    ],
  },
  {
    id: 'familyIncome',
    question: 'Q4 — What is your family income range?',
    type: 'single',
    options: [
      { value: 'below_2_5L', label: 'Below ₹2.5L' },
      { value: '2_5L_to_8L', label: '₹2.5L–₹8L' },
      { value: '8L_to_20L', label: '₹8L–₹20L' },
      { value: 'above_20L', label: 'Above ₹20L' },
    ],
  },
  {
    id: 'location',
    question: 'Q5 — Where are you located?',
    type: 'single',
    options: [
      { value: 'metro', label: 'Metro City' },
      { value: 'tier2', label: 'Tier-2 City' },
      { value: 'small_town', label: 'Small Town' },
      { value: 'rural', label: 'Rural Area' },
      { value: 'willing_to_relocate', label: 'Willing to Relocate' },
    ],
  },
  {
    id: 'constraints',
    question: 'Q6 — What constraints do you face? (Select all that apply)',
    type: 'multiple',
    options: [
      { value: 'cannot_afford_expensive_college', label: 'Cannot afford expensive college' },
      { value: 'need_to_earn_quickly', label: 'Need to earn quickly' },
      { value: 'cannot_move_from_city', label: 'Cannot move from city' },
      { value: 'english_difficulty', label: 'English difficulty' },
      { value: 'first_generation_student', label: 'First-generation college student' },
      { value: 'no_constraints', label: 'No constraints' },
    ],
  },
  {
    id: 'careerPriorities',
    question: 'Q7 — What are your top career priorities? (Select top 3)',
    type: 'multiple',
    max: 3,
    options: [
      { value: 'high_salary', label: 'High Salary' },
      { value: 'job_security', label: 'Job Security' },
      { value: 'prestige', label: 'Prestige' },
      { value: 'work_life_balance', label: 'Work-Life Balance' },
      { value: 'fast_growth', label: 'Fast Growth' },
      { value: 'meaningful_work', label: 'Meaningful Work' },
      { value: 'entrepreneurship', label: 'Entrepreneurship' },
      { value: 'stay_in_city', label: 'Stay in My City' },
    ],
  },
  {
    id: 'existingAchievements',
    question: 'Q8 — What have you already achieved? (Select all that apply)',
    type: 'multiple',
    options: [
      { value: 'built_project', label: 'Built a Project' },
      { value: 'internship', label: 'Completed Internship' },
      { value: 'competition_win', label: 'Won Competition' },
      { value: 'skill_certificate', label: 'Skill Certificate' },
      { value: 'small_business', label: 'Started Small Business' },
      { value: 'volunteer_work', label: 'Volunteer Work' },
      { value: 'starting_fresh', label: 'Starting Fresh' },
    ],
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function PathAIIntakeFlow({ onComplete, onCancel }: PathAIIntakeFlowProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Partial<StudentProfile>>({
    interests: [],
    constraints: [],
    careerPriorities: [],
    existingAchievements: [],
  });

  const question = QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100;

  const handleAnswer = (value: string | string[]) => {
    const newAnswers = { ...answers };

    if (question.type === 'single') {
      (newAnswers as any)[question.id] = value;
    } else {
      const currentValues = (newAnswers as any)[question.id] || [];
      if (Array.isArray(value)) {
        (newAnswers as any)[question.id] = value;
      } else {
        // Toggle selection
        if (currentValues.includes(value)) {
          (newAnswers as any)[question.id] = currentValues.filter((v: string) => v !== value);
        } else {
          // Check max limit for priorities
          if (question.max && currentValues.length >= question.max) {
            return; // Don't add more
          }
          (newAnswers as any)[question.id] = [...currentValues, value];
        }
      }
    }

    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Complete profile
      onComplete(answers as StudentProfile);
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const canProceed = () => {
    const answer = (answers as any)[question.id];
    if (question.type === 'single') {
      return answer !== undefined;
    } else {
      return Array.isArray(answer) && answer.length > 0;
    }
  };

  const isSelected = (value: string) => {
    const answer = (answers as any)[question.id];
    if (question.type === 'single') {
      return answer === value;
    } else {
      return Array.isArray(answer) && answer.includes(value);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          🎯 Career Profile
        </h2>
        <p className="text-gray-600">
          Help us understand you better to find the right career path.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Question {currentQuestion + 1} of {QUESTIONS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-blue-600 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6"
        >
          <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
            {question.question}
          </h3>

          {question.max && (
            <p className="text-sm text-gray-600 mb-4">
              Select up to {question.max} options
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {question.options.map((option) => (
              <motion.button
                key={option.value}
                onClick={() => handleAnswer(option.value)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`px-4 py-3 text-sm font-medium border-2 rounded-lg transition-all ${
                  isSelected(option.value)
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                {option.label}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex justify-between gap-4">
        <button
          onClick={currentQuestion === 0 ? onCancel : handleBack}
          className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {currentQuestion === 0 ? 'Cancel' : 'Back'}
        </button>

        <button
          onClick={handleNext}
          disabled={!canProceed()}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            canProceed()
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {currentQuestion === QUESTIONS.length - 1 ? 'Complete' : 'Next'}
        </button>
      </div>
    </div>
  );
}
