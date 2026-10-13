# Question source files

These are the reviewed question files. Each record carries
`review_status: "approved"` (set 2026-10-12 per the user's explicit
instruction, based on the lecturer's blanket "gunakan saja" approval).

## Known caveats (do not silently drop)

- One N4 answer key was flagged as potentially not matching its source
  PDF. If the lecturer sends corrections, update the record here and
  re-run `node scripts/build-questions.mjs`.
- 107 questions across levels have no answer key (`correct_answer: null`)
  and 147 listening questions are stubs (prompt/choices are audio/images,
  not extractable). Both are skipped at build time with a log — the exam
  currently runs on 240 questions (N5: 46, N4: 39, N3: 54, N2: 35, N1: 66)
  and the listening section is not tested yet.

## Catatan

Per-record notes (approved_note, key_source) sengaja tidak disimpan di file ini
untuk alasan estetika — seluruh dokumentasi provenance & caveat terpusat di sini.

## Privacy

These source files MAY contain raw `correct_answer` keys and review
metadata. They are never shipped to the app — the build script strips
everything except id/level/section/prompt/choices/answer_hash.
