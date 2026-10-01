/**
 * Levenshtein distance & fuzzy word matcher
 */

export function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Checks if token matches target with fuzzy tolerance
 * @param {string} token - Word spoken by user
 * @param {string} target - Expected target word
 * @param {number} maxDist - Max allowed distance (from config)
 * @param {number} minLen - Minimum word length to permit fuzzy matching (from config)
 */
export function isFuzzyMatch(token, target, maxDist = 1, minLen = 5) {
  if (token === target) return true;
  if (Math.max(token.length, target.length) >= minLen) {
    return levenshteinDistance(token, target) <= maxDist;
  }
  return false;
}
