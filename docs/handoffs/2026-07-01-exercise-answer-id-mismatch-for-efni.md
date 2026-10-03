> ⛔ **SUPERSEDED (2026-07-01).** efni investigated and this doc's **root-cause theory is wrong** — the
> `fs-idp→fs-idm` "divergence" is just a source **module boundary**, and efni's id pairing is 100% correct
> (0 orphan answers, consistent ids+numbers). The real cause: `cnxml-render` numbers EOC exercises
> **continuously across subsections** while the reader assumes **odd number ⇒ has answer** (`answerLinks.ts`
> parity skip), so in ch12–17 answered exercises drift onto even numbers → dead links **and** unreachable
> answers. Corrected diagnosis + the fix: `namsbokasafn-efni/docs/handoffs/2026-07-01-exercise-answer-has-answer-signal.md`.
> The symptom (ch12–17 broken) and the affected-chapter list below remain accurate; only the _cause_ was wrong.

# Handoff → namsbokasafn-efni: exercise↔answer id/number mismatch

> **From:** vefur PDF-redesign session, 2026-07-01. **For:** efni (content/pipeline debugging).
> **Why here:** the crosslinking code (`answerLinks.ts`) and the diagnosis live in vefur, but
> the **root cause is content/pipeline (efni's domain)**. This affects **both** the website reader
> and the PDF. Fits efni's chemistry clean-slate / fidelity thread.

## Symptom

End-of-chapter **exercise ↔ answer-key pairing is broken in 6 consecutive chapters** of
`efnafraedi-2e`. Chapters 1–11 and 18–21 pair 100%. Affected (odd exercises paired / total odd):

| chapter | paired / odd odd-exercises | answer-entries |
| ------- | -------------------------- | -------------- |
| ch12    | 17 / 42                    | 43             |
| ch13    | 19 / 45                    | 45             |
| ch14    | 24 / 48                    | 48             |
| ch15    | 37 / 53                    | 52             |
| ch16    | 28 / 33                    | 34             |
| ch17    | 17 / 25                    | 24             |

(Only **odd** exercises have answers, per OpenStax.)

## How the pairing works (website — done in vefur)

`src/lib/actions/answerLinks.ts` pairs an exercise to its answer by a **shared `fs-id`**:

- Exercise "Sjá svar" links to `/{book}/svarlykill/{chapter}#{exerciseId}` where
  `exerciseId = .eoc-exercise[data-exercise-id]` (= its `fs-id`).
- On the answer-key page it does `getElementById(exerciseId)` and scrolls/highlights.
- So it **requires the `.answer-entry` to carry the _same_ `fs-id`** as its `.eoc-exercise`.

**Consequence:** in ch12–17, for the unpaired exercises the reader's "Sjá svar" link navigates to
the answer-key page but **silently fails to scroll** (no element with that id). It's a **latent
website bug**, just less visible than in the PDF (it still lands on the page). The PDF
exercise↔answer link work is **deferred** until this is resolved.

## Diagnostic clue (please start here)

The failure is a **divergence partway through** each affected chapter — early exercises pair, the
tail does not. At the divergence point the exercise **id prefix switches `fs-idp*` → `fs-idm*`**,
and the **answer-key only ever contains `fs-idp*` ids**. Example (ch15):

```
… exercise 59  id=fs-idp2976256   ✓ has a matching fs-idp answer
   exercise 61  id=fs-idm212489824 ✗ no matching answer (idm namespace)
   exercise 63,65,…,91             ✗ all fs-idm*, unpaired
```

`fs-idp` vs `fs-idm` are different CNXML/DocBook auto-id namespaces. The exercises past the
divergence get `fs-idm*` ids while their answers (if they exist) are keyed `fs-idp*` — or the
answer-key simply lacks entries for them. So the exercise-file and answer-key-file ids/numbers
**drift out of sync** for the tail in ch12–17.

## The question for efni (source vs pipeline?)

1. **Source?** Do the OpenStax CNXML originals for ch12–17 already carry inconsistent ids between
   the problem and its solution (i.e. the shared-id assumption was never valid for these)?
2. **Pipeline?** Does the exercise/answer **split** or `cnxml-render` **id generation** assign the
   `fs-idm*` namespace to the tail (e.g. answers generated from only part of the exercises, or a
   two-pass id-gen that renumbers), breaking the pairing?

Either way, the fix belongs efni-side (it must re-establish a stable shared key between each
`.eoc-exercise` and its `.answer-entry` — same `data-exercise-id` **and** `data-exercise-number`).

## What unblocks on the vefur side once fixed

- Website: the reader "Sjá svar / Sjá æfingu" links will scroll correctly for all odd exercises.
- PDF: the deferred exercise↔answer link injection (vefur `docs/plans/2026-07-01-pdf-redesign-plan.md`
  Task 3.3) becomes worth building at full coverage — the mechanism is ready (shared-id pairing +
  `pdf-links` harvest), it just needs the ids to align.
