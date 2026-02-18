function calculateScore(timeTakenSeconds, attempts) {
  const baseScore = 1000;
  const timePenalty = Math.floor((timeTakenSeconds || 0) / 10);
  const attemptPenalty = Math.max(0, (attempts - 1) * 50);
  const finalScore = Math.max(100, baseScore - timePenalty - attemptPenalty);
  return finalScore;
}

module.exports = {
  calculateScore,
};
