import React, { useEffect, useState } from 'react';
import { QuizQuestion, StudyItem } from '../types';
import { clampQuizTimeLimit, MIN_QUIZ_ITEMS, shuffleArray } from '../lib/study';
import {
  getStudyItemDisplay,
  getStudyItemPrompt,
  getVocabularyBaseLabel,
  getVocabularyGrammarFormLabel,
  hasGrammarStudyData,
  isAdjectiveVocabulary,
  isKanji,
  isVerbVocabulary,
} from '../lib/studyItems';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DrawingCanvas } from './DrawingCanvas';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Timer, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';
import { AppStat, appStatLabelClass, appStatShellClass, appStatValueClass } from './shared/AppStat';

interface QuizProps {
  datasetName: string;
  itemList: StudyItem[];
  type: 'writing' | 'multiple-choice' | 'reverse-choice' | 'grammar-choice';
  shuffleQuestions?: boolean;
  timeLimit?: number;
  showFuriganaInReverseChoices?: boolean;
  onComplete: (score: number) => void;
  onExit: () => void;
}

const buildOptions = (correctAnswer: string, candidates: string[]) => {
  const distractors = [...new Set(candidates.filter((candidate) => candidate && candidate !== correctAnswer))]
    .slice(0, 3);

  return shuffleArray([correctAnswer, ...distractors]);
};

const getReverseChoiceOptionLabel = (item: StudyItem, showFuriganaInReverseChoices: boolean) =>
  showFuriganaInReverseChoices ? getStudyItemPrompt(item) : getStudyItemDisplay(item);

const getVerbGrammarQuestions = (
  sourceItems: StudyItem[],
  showFuriganaInReverseChoices: boolean
) => {
  const verbItems = sourceItems.filter(isVerbVocabulary);

  return verbItems
    .map((item) => {
      const correctAnswer = getVocabularyGrammarFormLabel(
        item.teForm,
        item.teFormFurigana,
        showFuriganaInReverseChoices
      );

      if (!correctAnswer) {
        return null;
      }

      const candidates = verbItems
        .filter((candidate) => candidate.id !== item.id)
        .map((candidate) =>
          getVocabularyGrammarFormLabel(
            candidate.teForm,
            candidate.teFormFurigana,
            showFuriganaInReverseChoices
          )
        )
        .filter(Boolean);

      return {
        itemId: item.id,
        type: 'te-form',
        correctAnswer,
        options: buildOptions(correctAnswer, candidates),
        prompt: `Te-form of ${getVocabularyBaseLabel(item, showFuriganaInReverseChoices)}`,
      } satisfies QuizQuestion;
    })
    .filter(Boolean) as QuizQuestion[];
};

const getAdjectiveGrammarQuestions = (
  sourceItems: StudyItem[],
  showFuriganaInReverseChoices: boolean
) => {
  const adjectiveItems = sourceItems.filter(isAdjectiveVocabulary);
  const adjectivePool = adjectiveItems.flatMap((item) =>
    [
      getVocabularyGrammarFormLabel(
        item.negativeForm,
        item.negativeFurigana,
        showFuriganaInReverseChoices
      ),
      getVocabularyGrammarFormLabel(item.pastForm, item.pastFurigana, showFuriganaInReverseChoices),
      getVocabularyGrammarFormLabel(
        item.pastNegativeForm,
        item.pastNegativeFurigana,
        showFuriganaInReverseChoices
      ),
    ].filter(Boolean)
  );

  return adjectiveItems
    .map((item) => {
      const availableTargets = [
        {
          label: 'Negative form',
          answer: getVocabularyGrammarFormLabel(
            item.negativeForm,
            item.negativeFurigana,
            showFuriganaInReverseChoices
          ),
        },
        {
          label: 'Past form',
          answer: getVocabularyGrammarFormLabel(
            item.pastForm,
            item.pastFurigana,
            showFuriganaInReverseChoices
          ),
        },
        {
          label: 'Past negative form',
          answer: getVocabularyGrammarFormLabel(
            item.pastNegativeForm,
            item.pastNegativeFurigana,
            showFuriganaInReverseChoices
          ),
        },
      ].filter((target) => target.answer);

      if (!availableTargets.length) {
        return null;
      }

      const selectedTarget = shuffleArray(availableTargets)[0];
      const sameItemDistractors = availableTargets
        .map((target) => target.answer)
        .filter((candidate) => candidate && candidate !== selectedTarget.answer);
      const pool = adjectivePool.filter((candidate) => candidate !== selectedTarget.answer);

      return {
        itemId: item.id,
        type: 'conjugation',
        correctAnswer: selectedTarget.answer,
        options: buildOptions(selectedTarget.answer, [...sameItemDistractors, ...pool]),
        prompt: `${selectedTarget.label} of ${getVocabularyBaseLabel(
          item,
          showFuriganaInReverseChoices
        )}`,
      } satisfies QuizQuestion;
    })
    .filter(Boolean) as QuizQuestion[];
};

const answerButtonBaseClass =
  'h-auto min-h-[4.35rem] justify-between gap-3 rounded-[24px] border px-4 py-3.5 text-left text-[15px] font-semibold leading-6 whitespace-normal break-words transition-all duration-200 sm:min-h-[5rem] sm:px-5 sm:py-4 sm:text-base';

const quizPromptPanelClass =
  'rounded-[30px] border border-slate-200 bg-[linear-gradient(150deg,rgba(255,255,255,0.98),rgba(238,242,255,0.72))] px-5 py-8 text-center dark:border-slate-800 dark:bg-[linear-gradient(150deg,rgba(15,23,42,0.98),rgba(30,41,59,0.88))] sm:px-8 sm:py-10';

const quizInfoPanelClass =
  'rounded-[28px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70 sm:p-5';

const quizAnswerMetaCardClass =
  'rounded-2xl bg-white/80 p-3 dark:bg-slate-950/80';

const quizAnswerMetaLabelClass =
  'text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400';

const quizAnswerMetaValueClass =
  'mt-2 font-medium leading-6 text-slate-900 whitespace-normal break-words dark:text-slate-100';

interface QuizPromptPanelProps {
  kicker: string;
  instruction: string;
  content: React.ReactNode;
  contentClassName?: string;
}

const QuizPromptPanel: React.FC<QuizPromptPanelProps> = ({
  kicker,
  instruction,
  content,
  contentClassName,
}) => (
  <div className={quizPromptPanelClass}>
    <p className="app-kicker">{kicker}</p>
    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{instruction}</p>
    <div
      className={cn(
        'mt-5 font-black tracking-tight text-slate-900 whitespace-normal break-words dark:text-slate-50',
        contentClassName
      )}
    >
      {content}
    </div>
  </div>
);

interface QuizAnswerMetaCardProps {
  label: string;
  value: React.ReactNode;
}

const QuizAnswerMetaCard: React.FC<QuizAnswerMetaCardProps> = ({ label, value }) => (
  <div className={quizAnswerMetaCardClass}>
    <div className={quizAnswerMetaLabelClass}>{label}</div>
    <div className={quizAnswerMetaValueClass}>{value}</div>
  </div>
);

const getQuizModeLabel = (quizType: QuizProps['type']) => {
  switch (quizType) {
    case 'writing':
      return 'Writing Practice';
    case 'reverse-choice':
      return 'Reverse Quiz';
    case 'grammar-choice':
      return 'Grammar Drill';
    default:
      return 'Meaning Quiz';
  }
};

const getQuizEmptyStateCopy = (quizType: QuizProps['type']) => {
  switch (quizType) {
    case 'writing':
      return {
        title: 'Not enough kanji for writing practice',
        description:
          `Writing practice needs at least ${MIN_QUIZ_ITEMS} kanji items in the selected practice scope.`,
      };
    case 'grammar-choice':
      return {
        title: 'Not enough grammar-ready vocabulary found',
        description:
          `Grammar drill needs at least ${MIN_QUIZ_ITEMS} verbs or adjectives with grammar data.`,
      };
    default:
      return {
        title: 'Not enough quiz items available',
        description:
          `This quiz needs at least ${MIN_QUIZ_ITEMS} compatible items in the selected practice scope.`,
      };
  }
};

const getPromptDisplayClass = (quizType: QuizProps['type'], prompt: string) => {
  const length = prompt.trim().length;

  if (quizType === 'multiple-choice') {
    if (length <= 2) {
      return 'text-5xl sm:text-7xl';
    }

    if (length <= 10) {
      return 'text-4xl sm:text-5xl';
    }

    return 'text-3xl sm:text-4xl';
  }

  if (quizType === 'reverse-choice') {
    return length > 40 ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl';
  }

  if (quizType === 'grammar-choice') {
    return length > 28 ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl';
  }

  return 'text-4xl';
};

const getQuestionReviewLabel = (
  quizType: QuizProps['type'],
  questionType: QuizQuestion['type']
) => {
  if (quizType === 'writing') {
    return 'Write the kanji for';
  }

  if (quizType === 'grammar-choice') {
    return questionType === 'te-form' ? 'Te-form prompt' : 'Conjugation prompt';
  }

  if (quizType === 'reverse-choice') {
    return 'Meaning prompt';
  }

  return 'Question prompt';
};

const getQuestionReviewAnswer = (question: QuizQuestion) => {
  if (question.userAnswer && question.userAnswer.trim()) {
    return question.userAnswer;
  }

  return 'No answer';
};

export const Quiz: React.FC<QuizProps> = ({
  datasetName,
  itemList,
  type,
  shuffleQuestions = false,
  timeLimit = 30,
  showFuriganaInReverseChoices = false,
  onComplete,
  onExit,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(clampQuizTimeLimit(timeLimit));
  const [timedOut, setTimedOut] = useState(false);

  const normalizedTimeLimit = clampQuizTimeLimit(timeLimit);

  useEffect(() => {
    const sourceItems = type === 'writing' ? itemList.filter(isKanji) : itemList;
    const getOptionLabel = (item: StudyItem) =>
      getReverseChoiceOptionLabel(item, showFuriganaInReverseChoices);

    const generatedQuestions: QuizQuestion[] =
      type === 'grammar-choice'
        ? [
            ...getVerbGrammarQuestions(
              sourceItems.filter(hasGrammarStudyData),
              showFuriganaInReverseChoices
            ),
            ...getAdjectiveGrammarQuestions(
              sourceItems.filter(hasGrammarStudyData),
              showFuriganaInReverseChoices
            ),
          ]
        : sourceItems.map((item) => {
            if (type === 'multiple-choice') {
              const options = buildOptions(
                item.meaning,
                shuffleArray<StudyItem>(sourceItems.filter((candidate) => candidate.id !== item.id)).map(
                  (candidate) => candidate.meaning
                )
              );

              return {
                itemId: item.id,
                type: 'meaning',
                correctAnswer: item.meaning,
                options,
                prompt: getStudyItemPrompt(item),
              };
            }

            if (type === 'reverse-choice') {
              const options = buildOptions(
                getOptionLabel(item),
                shuffleArray<StudyItem>(sourceItems.filter((candidate) => candidate.id !== item.id)).map(
                  (candidate) => getOptionLabel(candidate)
                )
              );

              return {
                itemId: item.id,
                type: 'meaning',
                correctAnswer: getOptionLabel(item),
                options,
                prompt: item.meaning,
              };
            }

            return {
              itemId: item.id,
              type: 'writing',
              correctAnswer: item.character,
              prompt: item.meaning,
            };
          });

    const normalizedQuestions =
      generatedQuestions.length >= MIN_QUIZ_ITEMS
        ? (shuffleQuestions ? shuffleArray(generatedQuestions) : generatedQuestions)
        : [];

    setQuestions(normalizedQuestions);
    setCurrentIndex(0);
    setScore(0);
    setShowResult(false);
    setIsFinished(false);
    setSelectedOption(null);
    setTimedOut(false);
    setTimeLeft(normalizedTimeLimit);
  }, [itemList, normalizedTimeLimit, shuffleQuestions, showFuriganaInReverseChoices, type]);

  const sourceItems = type === 'writing' ? itemList.filter(isKanji) : itemList;
  const itemById = new Map<string, StudyItem>(sourceItems.map((item) => [item.id, item]));
  const currentQuestion = questions[currentIndex];
  const currentItem = sourceItems.find((item) => item.id === currentQuestion?.itemId);

  const recordQuestionResult = (answer: string, isCorrect: boolean) => {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question, index) =>
        index === currentIndex
          ? {
              ...question,
              userAnswer: answer,
              isCorrect,
            }
          : question
      )
    );
  };

  const finishQuiz = (finalScore: number) => {
    setIsFinished(true);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
    });
    onComplete(finalScore);
  };

  const handleAnswer = (answer: string) => {
    if (showResult) {
      return;
    }

    setSelectedOption(answer);
    const isCorrect = answer === currentQuestion.correctAnswer;
    recordQuestionResult(answer, isCorrect);
    if (isCorrect) {
      setScore((currentScore) => currentScore + 1);
    }
    setTimedOut(false);
    setShowResult(true);
  };

  const handleNext = (finalScore = score) => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((index) => index + 1);
      setShowResult(false);
      setSelectedOption(null);
      setTimedOut(false);
      return;
    }

    finishQuiz(finalScore);
  };

  const handleWritingResult = (isCorrect: boolean) => {
    recordQuestionResult(
      isCorrect ? 'Marked correct' : 'Marked incorrect',
      isCorrect
    );

    if (isCorrect) {
      const finalScore = score + 1;
      setScore(finalScore);
      handleNext(finalScore);
      return;
    }

    handleNext();
  };

  useEffect(() => {
    if (!questions.length || isFinished) {
      return;
    }

    setTimeLeft(normalizedTimeLimit);
    setTimedOut(false);
  }, [currentIndex, isFinished, normalizedTimeLimit, questions.length]);

  useEffect(() => {
    if (!currentQuestion || isFinished || showResult) {
      return;
    }

    if (timeLeft <= 0) {
      recordQuestionResult('Timed out', false);
      setTimedOut(true);
      setShowResult(true);
      return;
    }

    const timerId = window.setTimeout(() => {
      setTimeLeft((currentTime) => currentTime - 1);
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [currentQuestion, isFinished, showResult, timeLeft]);

  useEffect(() => {
    if (!timedOut || !showResult || isFinished) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      handleNext();
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [currentIndex, isFinished, score, showResult, timedOut]);

  const formattedTimeLeft = `${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(
    timeLeft % 60
  ).padStart(2, '0')}`;
  const modeLabel = getQuizModeLabel(type);
  const scorePercentage = questions.length ? Math.round((score / questions.length) * 100) : 0;
  const progressValue = questions.length ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const currentQuestionInstruction =
    type === 'writing'
      ? 'Trace or write the matching kanji, then mark your result.'
      : type === 'grammar-choice'
      ? currentQuestion?.type === 'te-form'
        ? 'Choose the correct te-form.'
        : 'Choose the correct conjugated form.'
      : type === 'multiple-choice'
        ? 'What does this item mean?'
        : 'Which item matches this meaning?';

  if (!questions.length) {
    const emptyState = getQuizEmptyStateCopy(type);

    return (
      <Card className="mx-auto w-full max-w-3xl overflow-hidden border border-slate-200/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-[0_36px_120px_rgba(2,6,23,0.72)]">
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="app-kicker">{modeLabel}</p>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">
                {emptyState.title}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                {emptyState.description}
              </p>
            </div>
            <div className={cn(appStatShellClass, 'min-w-[12rem] px-4 py-3')}>
              <div className={appStatLabelClass}>Collection</div>
              <div className={cn(appStatValueClass, 'mt-1 text-lg')}>{datasetName}</div>
            </div>
          </div>

          <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/80 px-5 py-6 text-sm leading-6 text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
            Add compatible study items or choose a different practice mode from the collection
            workspace.
          </div>

          <Button
            onClick={onExit}
            className="h-12 w-full rounded-2xl bg-slate-900 text-base font-semibold hover:bg-slate-800"
          >
            Back to Collection
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isFinished) {
    return (
      <Card className="mx-auto w-full max-w-5xl overflow-hidden border border-slate-200/80 bg-white shadow-[0_36px_120px_rgba(15,23,42,0.1)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-[0_36px_120px_rgba(2,6,23,0.72)]">
        <CardContent className="space-y-6 p-6 sm:p-8">
          <section className="space-y-5 rounded-[32px] border border-slate-200 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(238,242,255,0.72))] p-6 dark:border-slate-800 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.98),rgba(30,41,59,0.88))] sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <p className="app-kicker">{modeLabel}</p>
                <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                  Quiz Completed
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                  {score} out of {questions.length} answers were correct in {datasetName}. Review
                  the questions below before heading back.
                </p>
              </div>

              <Button
                onClick={onExit}
                className="h-12 w-full rounded-2xl bg-slate-900 px-5 text-base font-semibold hover:bg-slate-800 lg:w-auto"
              >
                Back to Collection
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <AppStat
                label="Accuracy"
                value={`${scorePercentage}%`}
                valueClassName="mt-2 text-3xl text-indigo-600 dark:text-indigo-300"
              />
              <AppStat label="Correct" value={score} />
              <AppStat label="Incorrect" value={questions.length - score} />
            </div>
          </section>

          <section className="space-y-3 rounded-[32px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60 sm:p-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Question Review</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Every question, your answer, and the correct one.
              </p>
            </div>

            <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
              {questions.map((question, index) => {
                const reviewItem = itemById.get(question.itemId);
                const wasCorrect = question.isCorrect === true;

                return (
                  <div
                    key={`${question.itemId}-${index}`}
                    className={cn(
                      'rounded-[26px] border bg-white p-4 shadow-sm dark:bg-slate-950 sm:p-5',
                      wasCorrect
                        ? 'border-emerald-200 shadow-emerald-100/60 dark:border-emerald-500/30 dark:shadow-none'
                        : 'border-rose-200 shadow-rose-100/60 dark:border-rose-500/30 dark:shadow-none'
                    )}
                  >
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                          {getQuestionReviewLabel(type, question.type)}
                        </div>
                        <div className="text-lg font-bold leading-snug text-slate-900 dark:text-slate-50 sm:text-xl">
                          {question.prompt ||
                            (reviewItem
                              ? getStudyItemDisplay(reviewItem)
                              : 'Prompt unavailable')}
                        </div>
                      </div>
                      <div
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]',
                          wasCorrect
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                        )}
                      >
                        {wasCorrect ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        {wasCorrect ? 'Correct' : 'Incorrect'}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/80">
                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                          Your Answer
                        </div>
                        <div className="mt-2 font-medium leading-6 text-slate-900 whitespace-normal break-words dark:text-slate-100">
                          {getQuestionReviewAnswer(question)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/80">
                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                          Correct Answer
                        </div>
                        <div className="mt-2 font-medium leading-6 text-slate-900 whitespace-normal break-words dark:text-slate-100">
                          {question.correctAnswer}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </CardContent>
      </Card>
    );
  }

  if (!currentQuestion || !currentItem) {
    return null;
  }

  const promptClassName = getPromptDisplayClass(type, currentQuestion.prompt);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <section className="app-panel space-y-4 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="app-kicker">{modeLabel}</p>
            <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">
              Question {currentIndex + 1} of {questions.length}
            </div>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{datasetName}</p>
          </div>

          <div
            className={cn(
              'flex items-center gap-2 rounded-full border px-4 py-2 shadow-sm',
              timeLeft <= 10 && !showResult
                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
                : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200'
            )}
          >
            <Timer
              className={cn(
                'h-4 w-4',
                timeLeft <= 10 && !showResult ? 'text-red-500' : 'text-indigo-500'
              )}
            />
            <span className="font-mono text-sm font-bold">{formattedTimeLeft}</span>
          </div>
        </div>

        <Progress value={progressValue} />

        <div className="flex items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span>{currentQuestionInstruction}</span>
          <span>{score} correct so far</span>
        </div>
      </section>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.24 }}
        >
          <Card className="overflow-hidden border border-slate-200/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-[0_36px_120px_rgba(2,6,23,0.72)]">
            <CardContent className="p-5 sm:p-8">
              {type === 'writing' && isKanji(currentItem) ? (
                <div className="space-y-6">
                  <QuizPromptPanel
                    kicker="Writing Prompt"
                    instruction="Write the kanji for this meaning."
                    content={currentQuestion.prompt}
                    contentClassName="text-3xl sm:text-4xl"
                  />

                  <div className="rounded-[30px] border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/70 sm:p-4">
                    <DrawingCanvas className="aspect-square w-full rounded-[24px] bg-white" />
                  </div>

                  {!showResult ? (
                    <Button
                      className="h-12 w-full rounded-2xl bg-slate-900 text-base font-semibold hover:bg-slate-800"
                      onClick={() => setShowResult(true)}
                    >
                      Check Answer
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className={quizInfoPanelClass}>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                          <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-white text-5xl font-black text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-50">
                            {currentItem.character}
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                              Correct Kanji
                            </div>
                            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                              {timedOut
                                ? 'Time ran out for this answer. It was marked incorrect.'
                                : 'Use your own judgment, then mark whether your writing matched the target.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {timedOut ? (
                        <Button
                          className="h-12 w-full rounded-2xl bg-slate-900 text-base font-semibold hover:bg-slate-800"
                          onClick={() => handleNext()}
                        >
                          Next Question <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Button
                            variant="outline"
                            className="h-12 rounded-2xl border-rose-200 bg-rose-50 text-base font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15"
                            onClick={() => handleWritingResult(false)}
                          >
                            <XCircle className="mr-2 h-4 w-4" /> Incorrect
                          </Button>
                          <Button
                            className="h-12 rounded-2xl bg-emerald-600 text-base font-semibold hover:bg-emerald-700"
                            onClick={() => handleWritingResult(true)}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Correct
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <QuizPromptPanel
                    kicker={modeLabel}
                    instruction={currentQuestionInstruction}
                    content={currentQuestion.prompt}
                    contentClassName={promptClassName}
                  />

                  <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                    {currentQuestion.options?.map((option, index) => {
                      const isCorrect = option === currentQuestion.correctAnswer;
                      const isSelected = selectedOption === option;

                      const className = cn(
                        answerButtonBaseClass,
                        showResult
                          ? isCorrect
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/10'
                            : isSelected
                              ? 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/10'
                              : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500 dark:hover:bg-slate-900'
                          : 'border-slate-200 bg-white text-slate-900 shadow-sm hover:-translate-y-0.5 hover:border-slate-900 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-900 dark:hover:text-slate-50'
                      );

                      return (
                        <Button
                          key={`${option}-${index}`}
                          variant="outline"
                          className={className}
                          onClick={() => handleAnswer(option)}
                          disabled={showResult}
                        >
                          <span
                            className={cn(
                              'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase',
                              showResult
                                ? isCorrect
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                  : isSelected
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                                    : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                            )}
                          >
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span className="min-w-0 flex-1 whitespace-normal break-words">
                            {option}
                          </span>
                          {showResult && isCorrect ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                          ) : showResult && isSelected ? (
                            <XCircle className="h-5 w-5 shrink-0" />
                          ) : null}
                        </Button>
                      );
                    })}
                  </div>

                  {showResult && (
                    <div className="mt-6 space-y-4">
                      <div
                        className={cn(
                          'rounded-[28px] border p-4 sm:p-5',
                          timedOut
                            ? 'border-amber-200 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-500/10'
                            : selectedOption === currentQuestion.correctAnswer
                              ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                              : 'border-rose-200 bg-rose-50/70 dark:border-rose-500/30 dark:bg-rose-500/10'
                        )}
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <QuizAnswerMetaCard
                            label="Your Answer"
                            value={timedOut ? 'Timed out' : selectedOption || 'No answer'}
                          />
                          <QuizAnswerMetaCard
                            label="Correct Answer"
                            value={currentQuestion.correctAnswer}
                          />
                        </div>

                        {timedOut && (
                          <p className="mt-3 text-sm leading-6 text-amber-800 dark:text-amber-300">
                            Time ran out for this question. It was marked incorrect automatically.
                          </p>
                        )}
                      </div>

                      <Button
                        className="h-12 w-full rounded-2xl bg-slate-900 text-base font-semibold hover:bg-slate-800"
                        onClick={() => handleNext()}
                      >
                        {currentIndex < questions.length - 1 ? (
                          <>
                            Next Question <ArrowRight className="ml-2 h-5 w-5" />
                          </>
                        ) : (
                          'Finish Quiz'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
