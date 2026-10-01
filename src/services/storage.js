/**
 * Safe localStorage wrapper with try/catch for storing student placement practice sessions
 */

const STORAGE_KEY_ATTEMPTS = 'fluentprep_attempts_v1';
const STORAGE_KEY_SETTINGS = 'fluentprep_settings_v1';

export const safeLocalStorage = {
  getItem: (key, fallback = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (err) {
      console.warn(`localStorage.getItem failed for key: ${key}`, err);
      return fallback;
    }
  },

  setItem: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn(`localStorage.setItem failed for key: ${key}`, err);
      return false;
    }
  },

  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.warn(`localStorage.removeItem failed for key: ${key}`, err);
      return false;
    }
  }
};

/**
 * Save an attempt to localStorage
 * @param {Object} attempt - { module: 'listening'|'dialog', setId, score, maxScore, details: [] }
 */
export function saveAttempt(attempt) {
  const attempts = safeLocalStorage.getItem(STORAGE_KEY_ATTEMPTS, []);
  const newAttempt = {
    id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    date: new Date().toISOString(),
    module: attempt.module,
    setId: attempt.setId,
    title: attempt.title || attempt.setId,
    rubricId: attempt.rubricId || (attempt.module === 'listening' ? 'listening' : 'dialogs'),
    rubricVersion: attempt.rubricVersion || 1,
    score: Number(attempt.score.toFixed(1)),
    maxScore: attempt.maxScore,
    percentage: Math.round((attempt.score / attempt.maxScore) * 100),
    parameterAverages: attempt.parameterAverages || [],
    details: attempt.details || []
  };

  attempts.unshift(newAttempt);
  // Keep last 200 attempts
  if (attempts.length > 200) attempts.length = 200;
  safeLocalStorage.setItem(STORAGE_KEY_ATTEMPTS, attempts);
  return newAttempt;
}

/**
 * Get all past practice attempts
 */
export function getAttempts() {
  return safeLocalStorage.getItem(STORAGE_KEY_ATTEMPTS, []);
}

/**
 * Get highest or recent score for a specific set
 */
export function getSetScoreInfo(moduleType, setId) {
  const attempts = getAttempts().filter(a => a.module === moduleType && a.setId === setId);
  if (attempts.length === 0) return null;
  const bestScore = Math.max(...attempts.map(a => a.score));
  const latest = attempts[0];
  return {
    attemptsCount: attempts.length,
    latestScore: latest.score,
    maxScore: latest.maxScore,
    latestPercentage: latest.percentage,
    bestScore,
    bestPercentage: Math.round((bestScore / latest.maxScore) * 100),
    lastPracticed: latest.date
  };
}

/**
 * Calculate dashboard metrics: total practice count, average score, practice streak, weak sets
 */
export function getDashboardMetrics() {
  const attempts = getAttempts();
  if (attempts.length === 0) {
    return {
      totalAttempts: 0,
      listeningCount: 0,
      dialogCount: 0,
      averagePercentage: 0,
      streakDays: 0,
      weakestSets: [],
      recentAttempts: []
    };
  }

  const listeningCount = attempts.filter(a => a.module === 'listening').length;
  const dialogCount = attempts.filter(a => a.module === 'dialog').length;
  const totalPercentage = attempts.reduce((acc, a) => acc + (a.percentage || 0), 0);
  const averagePercentage = Math.round(totalPercentage / attempts.length);

  // Calculate streak in consecutive calendar days
  const practiceDates = new Set(
    attempts.map(a => new Date(a.date).toDateString())
  );
  let streakDays = 0;
  let checkDate = new Date();
  
  // If not practiced today, check if practiced yesterday to keep streak
  if (!practiceDates.has(checkDate.toDateString())) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (practiceDates.has(checkDate.toDateString())) {
    streakDays++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Calculate weakest sets (grouped by module and setId)
  const setAggregates = {};
  attempts.forEach(a => {
    const key = `${a.module}:${a.setId}`;
    if (!setAggregates[key]) {
      setAggregates[key] = {
        key,
        module: a.module,
        setId: a.setId,
        title: a.title,
        scores: [],
        maxScore: a.maxScore
      };
    }
    setAggregates[key].scores.push(a.score);
  });

  const weakestSets = Object.values(setAggregates)
    .map(item => {
      const avgScore = item.scores.reduce((s, c) => s + c, 0) / item.scores.length;
      const avgPct = Math.round((avgScore / item.maxScore) * 100);
      return {
        module: item.module,
        setId: item.setId,
        title: item.title,
        attempts: item.scores.length,
        averageScore: Number(avgScore.toFixed(1)),
        maxScore: item.maxScore,
        averagePercentage: avgPct
      };
    })
    .filter(s => s.averagePercentage < 75)
    .sort((a, b) => a.averagePercentage - b.averagePercentage)
    .slice(0, 5);

  return {
    totalAttempts: attempts.length,
    listeningCount,
    dialogCount,
    averagePercentage,
    streakDays,
    weakestSets,
    recentAttempts: attempts.slice(0, 10)
  };
}

/**
 * Clear all practice history
 */
export function clearAllProgress() {
  safeLocalStorage.removeItem(STORAGE_KEY_ATTEMPTS);
}

/**
 * Save user app settings (e.g. voice rate, mode preference)
 */
export function getAppSettings() {
  return safeLocalStorage.getItem(STORAGE_KEY_SETTINGS, {
    speechRate: 1.0,
    preferredVoiceName: '',
    theme: 'dark'
  });
}

export function saveAppSettings(newSettings) {
  const current = getAppSettings();
  const updated = { ...current, ...newSettings };
  safeLocalStorage.setItem(STORAGE_KEY_SETTINGS, updated);
  return updated;
}
