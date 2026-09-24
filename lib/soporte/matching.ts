/**
 * Matching de preguntas contra `faq_entries` por superposición de palabras
 * clave — sin IA (ver AGENTS.md/decisión del usuario: arranca simple, se
 * puede migrar a matching semántico con AI Gateway más adelante).
 */

const STOPWORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al",
  "a", "en", "y", "o", "que", "que", "es", "soy", "mi", "me", "se", "su",
  "por", "para", "con", "sin", "como", "cuando", "donde", "no", "si", "ya",
  "esta", "este", "esto", "tengo", "hay", "puedo", "quiero", "hola",
]);

/** Minúsculas, sin tildes/puntuación — la misma normalización se usa tanto para `keywords` guardadas como para la pregunta entrante. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

/** Palabras clave sugeridas a partir de una pregunta — usado para precargar `keywords` al crear una FAQ. */
export function deriveKeywords(pregunta: string): string[] {
  return Array.from(new Set(tokenize(pregunta)));
}

export type FaqCandidate = {
  id: string;
  keywords: string[];
};

/** Al menos 2 palabras en común, o 1 si la FAQ tiene pocas keywords — evita que preguntas cortas ("costos?") maten el match por longitud. */
const MIN_OVERLAP = 2;

function score(questionTokens: Set<string>, keywords: string[]): number {
  let overlap = 0;
  for (const keyword of keywords) {
    if (questionTokens.has(normalizeText(keyword))) overlap += 1;
  }
  return overlap;
}

/** Devuelve el id de la FAQ con más superposición de keywords, o `null` si ninguna llega al umbral mínimo. */
export function matchFaq<T extends FaqCandidate>(pregunta: string, candidates: T[]): T | null {
  const questionTokens = new Set(tokenize(pregunta));
  if (questionTokens.size === 0) return null;

  let best: T | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const threshold = Math.min(MIN_OVERLAP, candidate.keywords.length || MIN_OVERLAP);
    const candidateScore = score(questionTokens, candidate.keywords);
    if (candidateScore >= threshold && candidateScore > bestScore) {
      best = candidate;
      bestScore = candidateScore;
    }
  }

  return best;
}
