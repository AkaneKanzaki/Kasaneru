// Penilaian gaya JLPT dengan ambang per seksi (section floors).
//
// Skor di sini adalah ESTIMASI (penskalaan linear dari jawaban benar),
// bukan skor resmi JLPT — UI wajib menampilkan S.estimatedScore.
//
// Aturan lulus (resmi):
// - N5: total >= 80/180; Language Knowledge (+Reading) >= 38/120;
//   Listening >= 19/60
// - N4: total >= 90/180; LK(+Reading) >= 38/120; Listening >= 19/60
// - N3: total >= 95/180; LK >= 19/60; Reading >= 19/60; Listening >= 19/60
// - N2: total >= 90/180; floors 19/60 tiap seksi
// - N1: total >= 100/180; floors 19/60 tiap seksi

export interface ScoreInput {
  level: string;
  vocabCorrect: number;
  vocabTotal: number;
  grammarCorrect: number;
  grammarTotal: number;
  readingCorrect: number;
  readingTotal: number;
  listeningCorrect: number;
  listeningTotal: number;
}

export interface ScoreResult {
  knowledge: number;
  knowledgeMax: number;
  reading: number;
  listening: number;
  total: number;
  passed: boolean;
}

const PASS_TOTALS: Record<string, number> = {
  N5: 80,
  N4: 90,
  N3: 95,
  N2: 90,
  N1: 100,
};

// Penskalaan linear jawaban benar -> skor seksi (0..max).
function scaled(correct: number, total: number, max: number): number {
  if (total <= 0) return 0;
  return Math.min(max, Math.max(0, Math.round((correct / total) * max)));
}

// Mengembalikan skor seksi yang diskalakan (0..60, atau 0..120 untuk
// knowledge N5/N4), total, dan status lulus (total + floor terpenuhi).
//
// CATATAN: seksi yang tidak diuji (tidak ada soal di bank untuk level ini,
// mis. listening yang masih berupa stub audio) dikecualikan dari floor —
// seksi tanpa soal tidak boleh menggugurkan peserta.
export function score(input: ScoreInput): ScoreResult {
  const {
    level,
    vocabCorrect,
    vocabTotal,
    grammarCorrect,
    grammarTotal,
    readingCorrect,
    readingTotal,
    listeningCorrect,
    listeningTotal,
  } = input;

  let knowledge: number;
  let reading: number;
  let listening: number;
  let knowledgeMax: number;

  if (level === 'N5' || level === 'N4') {
    // N5/N4: vocab + grammar + reading digabung jadi satu seksi (maks 120).
    knowledgeMax = 120;
    knowledge = scaled(
      vocabCorrect + grammarCorrect + readingCorrect,
      vocabTotal + grammarTotal + readingTotal,
      120,
    );
    reading = 0; // digabung ke knowledge untuk N5/N4
  } else {
    // N3/N2/N1: reading seksi tersendiri (maks 60).
    knowledgeMax = 60;
    knowledge = scaled(vocabCorrect + grammarCorrect, vocabTotal + grammarTotal, 60);
    reading = scaled(readingCorrect, readingTotal, 60);
  }
  listening = scaled(listeningCorrect, listeningTotal, 60);

  const total = knowledge + reading + listening;
  const passTotal = PASS_TOTALS[level] ?? 80;

  const n5n4 = level === 'N5' || level === 'N4';
  const knowledgeTested = n5n4
    ? vocabTotal + grammarTotal + readingTotal > 0
    : vocabTotal + grammarTotal > 0;
  const readingTested = !n5n4 && readingTotal > 0;
  const listeningTested = listeningTotal > 0;

  const floorsOk = n5n4
    ? (!knowledgeTested || knowledge >= 38) && (!listeningTested || listening >= 19)
    : (!knowledgeTested || knowledge >= 19) &&
      (!readingTested || reading >= 19) &&
      (!listeningTested || listening >= 19);

  return {
    knowledge,
    knowledgeMax,
    reading,
    listening,
    total,
    passed: total >= passTotal && floorsOk,
  };
}
