export const shuffleArray = <T,>(items: T[]) => {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled;
};

export const MIN_QUIZ_ITEMS = 5;

export const clampQuizTimeLimit = (value: number) => {
  if (!Number.isFinite(value)) {
    return 30;
  }

  return Math.min(300, Math.max(5, Math.round(value)));
};
