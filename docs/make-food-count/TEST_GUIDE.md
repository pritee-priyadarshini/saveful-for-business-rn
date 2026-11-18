# Make Food Count — UAT test guide

Use a staging organisation with Groups, Territories, three sites, staff, a Site Admin, a territory manager, a charity and a farmer (see A0).

Preview without a live API: set `EXPO_PUBLIC_MFC_PREVIEW=1` in a `__DEV__` build (Consolidated preview wins if both flags are set).

| ID | Account | Path | Expected |
|---|---|---|---|
| **UAT-01** | Kitchen staff | Home → Make Food Count → select 2+ sources → Continue → enter kg on source 1 → switch chips → return | Values on each tab are unchanged. Leaving / backgrounding still keeps them after relaunch. |
| **UAT-02** | Kitchen staff | Overproduction only: Chicken 5, Beef 3, Fish 2 → Review | Total **10 kg**; For people **10 kg**; Other **0 kg** (no Fit-for-humans tick: all Overproduction is for review in the people listing). |
| **UAT-03** | Kitchen staff | Continue UAT-02; add Preparation 4 kg + Plate Scraps 2 kg → Review | Total **16 kg**; For people **7 kg**; Other **9 kg**. |
| **UAT-04** | Kitchen staff | Overproduction meat & seafood groups | Every subtype row is distinct; Fit ticks are independent; group total rows match the sum of subtypes. |
| **UAT-05** | Kitchen staff | On Summary, Back to recording → edit a qty and untick Fit on Beef | Totals and “X kg available” on both listing cards update; nothing is lost when returning to Summary. |
| **UAT-06** | Kitchen staff | Summary → List surplus for people (after UAT-02/03) | Prefill totals exactly **7 kg**; green MFC banner; Counted labels; qty cannot exceed available; publish returns to Summary with “Listed 7 kg for people”. |
| **UAT-07** | Kitchen staff | Summary → List surplus not fit (after UAT-03) | Prefill totals exactly **9 kg**; no destination / Intended reuse chips; publish returns to Summary. |
| **UAT-08** | Kitchen staff + charity | Publish people listing → before collection check Impact / outcomes | Recovered **0**. Charity collects **4 kg** of the 7 → Summary / Impact show Collected **4 of 7 kg** / recovered **4**. |
| **UAT-09** | Kitchen staff | Mid-publish: double-tap Publish; back out; kill mid-submit; airplane mode then retry | No duplicate listing (`Idempotency-Key` + submit lock). Draft / prefill not lost. |
| **UAT-10** | Territory manager | Insights / Home → Food Impact → open filters | Only that territory’s sites appear; totals exclude other territories. |
| **UAT-11** | Any business user | Every MFC screen + both prefilled listing screens on **iPhone portrait** and **iPad landscape** | No clipping; no horizontal scroll; touch targets ≥ 44 pt. |
| **UAT-12** | Kitchen staff | Save record without listing → Home → Recent records → reopen | Confirmation on Home; record reopens on Summary (or Record if still draft) and remains editable within server rules. |

## Smoke checklist (release)

- [ ] Home: Make Food Count card above surplus; Continue recording when draft exists
- [ ] Surplus card: small overlay icon removed; List Surplus unchanged
- [ ] Impact tiles: Food recorded · Food diverted · Collections · CO₂ avoided; View detailed insights → Food Impact
- [ ] Sources: stepper; Continue disabled at 0; tablet 2×2
- [ ] Record: chips, meat/seafood groups, Fit column, autosave / offline notice
- [ ] Summary: three actions; outcomes after listing; footer recovery notice
- [ ] Normal List Surplus (no `mfc` param) still works unchanged
- [ ] Accessibility: labelled inputs/checkboxes, image alt text, announced errors

## Orientation / native build (A8)

Current `app.config.js`:

| Setting | Value | Effect |
|---|---|---|
| `orientation` | `portrait` | App defaults to portrait |
| `ios.supportsTablet` | `false` | No iPad-optimised binary |
| `ios.requireFullScreen` | `true` | No iPad multitasking split |
| `UISupportedInterfaceOrientations` (+ iPad) | Portrait only | Native iOS will not rotate |

**Store build required** to ship real iPad landscape: set `supportsTablet: true`, allow landscape orientations in `infoPlist`, and reconsider `requireFullScreen`. Until then, JS unlocks orientation inside the MFC stack, but the native plist still blocks landscape on device.

**OTA (`eas update`)** can ship all of Make Food Count. The draft is persisted with `expo-file-system` (already in every binary), so no new native module is involved. Only the orientation / tablet plist changes need a **store / native rebuild**; until then the iPad runs the phone layout.

## Typecheck

`npx tsc --noEmit` — baseline **23** pre-existing errors; **0** new in Make Food Count paths (verified during A8).

## Pass / fail log (fill during UAT)

| ID | Pass / fail | Evidence |
|---|---|---|
| UAT-01 | _pending_ | |
| UAT-02 | _pending_ | |
| UAT-03 | _pending_ | |
| UAT-04 | _pending_ | |
| UAT-05 | _pending_ | |
| UAT-06 | _pending_ | |
| UAT-07 | _pending_ | |
| UAT-08 | _pending_ | needs B4 + staging |
| UAT-09 | _pending_ | |
| UAT-10 | _pending_ | needs B5 + territory manager |
| UAT-11 | _pending_ | needs device / simulator pass |
| UAT-12 | _pending_ | |
