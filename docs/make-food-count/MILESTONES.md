# Make Food Count — app milestones and AI prompts

How to use:

1. Open a fresh AI coding session in `saveful-for-business-rn`.
2. Paste the **app system prompt** below, then **one** milestone prompt.
3. Check the result yourself, commit, then move to the next milestone.

Backend milestones (B1–B6) are in `svforb/docs/make-food-count/MILESTONES.md`. An app milestone that needs a
backend milestone says so. Until that backend milestone is merged, build against preview fixtures that match
the backend SPEC exactly.

| Day | App (this repo) | Needs | Client IDs / UAT |
|---|---|---|---|
| Mon 16 | **A0** you: send CLIENT_QUESTIONS, get icons · **A1** foundation | — | — |
| Tue 17 | **A2** Home + Sources · **A3** Recording tabs | B2 for live data | MFC-001…006 · UAT-01, 04 |
| Wed 18 | **A4** Summary · **A5** Listing prefill | B2, B3 | MFC-007…009 · UAT-02, 03, 05, 06, 07, 09, 12 |
| Thu 19 | **A6** Outcomes · **A7** Food Impact | B4, B5 | MFC-010 · UAT-08, 10 |
| Fri 20 | **A8** Tablet, accessibility, UAT, release | all | UAT-11 + full pass |

---

## App system prompt (paste first, every time)

```text
You are a senior React Native engineer on Saveful Connect, building "Make Food Count" (MFC).

Repos:
- App (you work here): /Users/swagatkumardash/projects/saveful-for-business-rn — Expo 54, RN 0.81,
  React Navigation, Zustand, axios (src/services/api.ts).
- Backend (read only unless told): /Users/swagatkumardash/projects/svforb — its
  docs/make-food-count/SPEC.md is the API contract.

Read first, every session:
- docs/make-food-count/SPEC.md — screens, labels, look, behaviour. §2 lists where the client prototype and
  written spec disagree; build the "Build default" column.
- svforb/docs/make-food-count/SPEC.md §5 and §7 for endpoints and payloads.
- If present, the V11 deck screenshots in docs/make-food-count/v11/ — match their layout and copy.

Rules:
1. UI = the Consolidated Collections kit: import from '@/components/consolidated/ui' (Surface, SectionTitle,
   Chip, Segmented, StatGrid, ProgressBar, StepTrack, Notice, EmptyState, SkeletonCard, ActionButton,
   HeaderAction, cc tokens). `meta` typography for sentence-case secondary text (caption/body/h1–h8 render
   UPPERCASE). Tabular numerals for kg. MFC headers are palette.eggplant (#4B2176) with the site name; the
   existing listing screens keep their green header. People action green (palette.kale), not-fit action orange
   (palette.orange). Touch targets ≥ 44pt. No eyebrow labels, no nested cards, no new button styles.
2. Reuse: CreateListingScreen, CreateFarmListingScreen, SurplusScreen, resolveFoodIconSource/FoodIconKey,
   useSubmitLock, useResponsiveLayout/buildFormShellStyles, estimateMealsSaved/estimateCo2AvoidedKg,
   the ConsolidatedReportScreen split-bar pattern, the src/dev/consolidatedPreview.tsx fixture pattern.
3. Don't change shared components (src/components/Button.tsx etc.). Existing listing, consolidated, claim and
   collection flows must behave exactly as before when not opened from MFC.
4. Every new screen must work on phone portrait and tablet landscape (use useResponsiveLayout); MFC screens use
   orientation 'default'.
5. Accessibility labels on every input/checkbox/image; inline errors under fields.
6. `npx tsc --noEmit` has a baseline of 23 pre-existing errors — add none. Verify on the iOS simulator
   (iPhone + iPad landscape) when a milestone has UI; say plainly if you couldn't.
7. Never commit, push, run `eas update`, or touch production data. Stop and report instead.
8. Finish with: files changed, how you verified (commands, screenshots taken), what's left, questions.
```

---

## A0 — You (not the AI)

- Send [CLIENT_QUESTIONS.md](CLIENT_QUESTIONS.md) today. Questions 1–6 are needed by Tuesday.
- Download the Drive icons into `assets/make-food-count/`, then export the deck pages into `docs/make-food-count/v11/`. Name the deck pages:

  | File | Deck page |
  |---|---|
  | `01-home.png` | Home |
  | `02-sources.png` | Select sources |
  | `03-overproduction.png` | Overproduction |
  | `04-spoilage.png` | Spoilage |
  | `05-preparation.png` | Preparation |
  | `06-plate-scraps.png` | Plate Scraps |
  | `07-summary.png` | Summary |
  | `08-people-listing.png` | People listing |
  | `09-not-fit-listing.png` | Not-fit listing |
  | `10-insights.png` | Insights |
- Make sure staging has a test organisation with Groups, Territories, three sites, staff and a Site Admin, a territory manager, a charity and a farmer.

## A1 — Foundation

```text
Milestone A1. Lay the plumbing for MFC; no finished screens yet.

1. src/types/makeFoodCount.ts — types mirroring svforb SPEC §3–§5 and §7 (taxonomy, record, line, outcomes,
   prefill, insights, home impact).
2. src/services/makeFoodCount.service.ts — typed calls for every /mfc endpoint + normalisers (Decimal strings →
   numbers rounded to 2 dp). Listing calls stay in foodListing.service.ts; add optional foodRecord +
   Idempotency-Key support there.
3. src/store/makeFoodCountStore.ts — zustand + persist (AsyncStorage): open draft by clientRequestId, lines by
   clientKey, server version, sync state; debounced autosave (800 ms) to PUT /lines; flush on tab switch, blur,
   AppState background; retry with backoff; 409 → refetch + flag for a Notice. Pure totals selectors
   (total, fit, notFit, per source, meat and seafood group totals) with unit-testable functions.
4. src/dev/makeFoodCountPreview fixtures (EXPO_PUBLIC_MFC_PREVIEW=1) serving taxonomy, a record, prefill,
   insights and home impact through an axios adapter, like consolidatedPreview.
5. Navigation: an MFC stack (Sources, Record, Summary, FoodImpact, SourceDrilldown) reachable from Home and
   the Insights tab, orientation 'default', purple header component MfcHeader (back, title, site name +
   switcher reusing the app's existing site selection).

Check: typecheck at baseline; the empty screens open in preview mode on iPhone and iPad.
```

## A2 — Home and Sources (MFC-001, 002)

```text
Milestone A2. Build MFC-001 and MFC-002 exactly as app SPEC §6 and the v11 screenshots.

1. Home: MakeFoodCountCard above the existing "Got surplus food?" card (Today's Waste pill, title, text,
   illustration, purple "Record Food Waste →" / "Continue recording →"). On the surplus card remove the small icon
   in the white box. "Your impact so far": Food recorded, Food diverted (rename from Food saved), Collections,
   CO₂ avoided from GET /mfc/home-impact; "View detailed insights →" opens Food Impact. Tablet: cards side by
   side, tiles in one row. Find the existing HomeScreen tiles first and change them in place.
2. Sources screen: phone stepper (Select sources · Add quantities · Review · List), title + intro, four image
   tiles with description and example line, checkbox state, "Continue (n selected) →" disabled at 0; tablet 2×2.
   Continue creates the draft (POST /records, idempotent) and opens Record on the first selected source.

Check: preview mode on iPhone + iPad; existing Home behaviour otherwise unchanged; typecheck at baseline.
```

## A3 — Recording tabs (MFC-003…006)

```text
Milestone A3. Build the Record screen per app SPEC §6–§8.

- Breadcrumb "k of n", chip row of selected sources only (current purple outline, finished green ✓), title,
  source panel with image, table Food item · Quantity (kg) [+ Fit for humans column on Overproduction, ticked by
  default], meat and seafood group headings with indented subtypes and a group total row, per-source summary,
  Overproduction disclaimer Notice, ‹ Back / Next food source → (last: Review food summary →).
- Decimal keypad, "0" placeholder, blank = not entered, inline validation (>0, ≤2 dp, ≤500).
- Every change goes to the store; switching chips never loses values; leaving or backgrounding flushes autosave.

Check: UAT-01 (tabs keep values), UAT-04 (all meat/seafood subtypes distinct, ticks independent), kill + relaunch
restores the draft, airplane mode shows "Saved on this phone, will sync" then syncs. iPhone + iPad. Typecheck.
```

## A4 — Summary and save (MFC-007)

```text
Milestone A4. Build the Food summary per app SPEC §6.

- Table: Food source · Total recorded · For people (Overproduction) · Other recorded food, lilac Total row, tap a
  row → that source tab. Three action cards (green people, orange not-fit with "X kg available", white save),
  disabled at 0 available. Footer Notice "Food is not counted as recovered until collection is verified."
- Save without listing → POST /save → back to Home with a confirmation; a "Recent records" list (Home card link
  or small screen) reopens a record into the Summary and allows editing.

Check: UAT-02 and UAT-03 numbers on screen; UAT-05 (edit qty, untick fit → totals and available kg change, nothing
lost); UAT-12 first half. Typecheck.
```

## A5 — Listing prefill (MFC-008, 009) — needs B3

```text
Milestone A5. Open the existing listing screens prefilled from a record.

1. Summary actions call GET /records/:id/listing-prefill?kind= and navigate to CreateListing (EDIBLE) or
   CreateFarmListing (NON_EDIBLE) with route param `mfc: {recordId, kind, items}`.
2. In those screens, only when `mfc` is present: green banner "✓ Items from Make Food Count have been carried
   forward…", items prefilled (name, category, icon, kg), "Counted: X kg" under each, qty capped at availableKg,
   items removable, extra items allowed (sent unlinked). All existing steps, validation, storage, allergens,
   pickup, contact and declaration unchanged. No "Intended reuse" chips. Submit sends `foodRecord` + an
   Idempotency-Key (clientRequestId:kind:attempt) with useSubmitLock.
3. On success return to the Summary with a Notice ("Listed 7 kg for people"); the other card stays usable.

Check: UAT-06 (exactly 7 kg), UAT-07 (exactly 9 kg, no destination question), UAT-09 (double tap, back, relaunch
mid-publish, airplane mode → no duplicate, nothing lost). Normal List Surplus still works untouched. Typecheck.
```

## A6 — Outcomes — needs B4

```text
Milestone A6. Show what happened to each listed kind on the Summary.

- Each action card shows the status from GET /records/:id: eligible → listed → claimed → collected (StepTrack or
  ProgressBar), with plain status text (Waiting for a claim / Claimed by <name> / Collected 4 of 7 kg / Expired /
  Cancelled). Line edits blocked by the server show its message inline.

Check: UAT-08 end to end on staging (publish → 0 recovered; partial 4 kg collected → 4 kg). Typecheck.
```

## A7 — Food Impact (MFC-010) — needs B5

```text
Milestone A7. Build Food Impact per app SPEC §6 (MFC-010) and the v11 Insights screenshots.

- Filter card (Reporting period presets, From/To, Group "Business unit", Territory "Geography", Cluster if any,
  Site; cascading from /insights/filters; Clear filters), state shared across tabs in a small zustand store.
- Segmented: Impact overview (three cards incl. "Not recovered", "Where did the food go?" split bar + legend,
  Redistribution destinations with % of recovered, Breakdown by category rows → source drill-down screen) ·
  What happened to the food? (recorded → listed → claimed → collected + not-recovered breakdown) · Food
  redistributed (by destination, category, site, trend).
- "Estimated" label on meals/CO₂; skeletons while loading; EmptyState for no data; no demo badge.
- Tablet: three overview cards in a row, "Where did the food go?" and destinations side by side.

Check: UAT-10 with a territory manager (only their sites in options and totals); numbers match the record screens.
Typecheck.
```

## A8 — Tablet, accessibility, UAT, release

```text
Milestone A8. Make MFC release-ready.

1. Walk every MFC screen plus the two prefilled listing screens on iPhone (portrait) and iPad (landscape): no
   clipping, no horizontal scroll (UAT-11). Check app.json orientation / ios.supportsTablet /
   ios.requireFullScreen and report what needs a new native build.
2. Accessibility pass (labels, focus order, announced errors, image alt text).
3. Write docs/make-food-count/TEST_GUIDE.md: UAT-01…12, each with account, path, expected result.
4. Final typecheck; list every UAT as pass/fail with evidence.

Do not release. Report what's needed for a store build vs an OTA update (new native config → store build).
```
