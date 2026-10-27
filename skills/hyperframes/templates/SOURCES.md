# Sources and claim ledger

Every factual assertion traces to this file: a number, a date, a quote, a priority claim or a
mechanism step taken from a source. A step the film derives on screen is recorded as a derivation
with its premises. No ledger row, no factual claim.

## Sources

4-12 for a deep dive. Prefer papers, official docs, standards and primary data; for the history of an
idea, letters, archives, biographies and contemporary accounts are sources too.

| id | title | author/publisher | URL | accessed | type | confidence |
|---|---|---|---|---|---|---|
| S1 | | | | | paper/docs/data/archive/letter/biography/contemporary account | high/medium/low |

## Claims

One row per factual assertion. Put the kind in the last column: number, date, quote, priority,
mechanism.

| id | claim (exact) | value / quote | source | kind / on-screen treatment |
|---|---|---|---|---|
| C1 | | | S1 | number - exact |
| C2 | | | S1 | quote - verbatim |
| C3 | | | S1 | date - spoken |

## Derived on screen

Premises the viewer accepts, the step the film works out, and the claim ids behind the premises.
Cite the label `derivation` in the beat's claims column.

| id | derivation | from claims |
|---|---|---|
| D1 | | C1, C2 |

## Mechanism check

- What the source says happens, step by step: ...
- What it does not say: ...
- Which step the film derives rather than quotes: ...
- Where the science is uncertain or contested: ...
- Common misconception this film must correct: ...

## The human story

- Who had the idea, and what problem were they solving: ...
- Who disagreed, and on what evidence: ...
- What was invented or measured first: ...
- What the sources do not establish about motive or sequence (keep it out, or mark it as a
  reconstruction): ...

## Rejected claims

| claim | why rejected |
|---|---|
| | not in source / outdated / unverifiable |

## Licences

- Music: <track, composer, licence, URL>
- Footage/images: <source, licence>
- 3D assets/fonts: <source, licence>
