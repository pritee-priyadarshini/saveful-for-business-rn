# Make Food Count: app spec

Sources:
- **Client spec:** *Make Food Count Development & Delivery Specification v1.0* (31 Oct 2026).
- **Prototype V11 deck:** *Saveful Make Food Count 2610* (26 Oct 2026). The live prototype is https://www.saveful.com/make-food-count (password from the client). The icon images are in the client's Google Drive folder linked in the deck.

Required delivery: **Friday 20 November 2026**.

The backend half (data model, API, metric maths, permissions) is in
`svforb/docs/make-food-count/SPEC.md`. This file covers the product, the screens and app behaviour.
Questions for the client are in [CLIENT_QUESTIONS.md](CLIENT_QUESTIONS.md).

---

## 1. What the client wants

A kitchen user, mainly at Compass sites (Eurest, Chartwells), records **all the food the kitchen didn't use** in one session, split by where it came from:

- **Overproduction**
- **Spoilage**
- **Preparation**
- **Plate Scraps**

Each food line has a weight in kg. The app totals it up. It then turns the food fit for people into a normal **food-for-people listing**, and the rest into a normal **not-fit-for-humans listing**. Both are prefilled, and both use the listing, claim and collection flows that already exist.

Managers see **Food Impact** insights: what was recorded and what actually happened to it, by source, category, site and time, filtered by Group, Territory and Site. Only food a receiver **actually collected** counts as recovered. The business never chooses a destination (farmer, composter and so on); receivers claim as they do today.

## 2. Which source wins when they disagree

The written spec (31 Oct) is newer than the deck (26 Oct), so it wins on **behaviour**. The deck wins on **look, labels and layout**. Every disagreement is in the table below; each is also question 1–8 in CLIENT_QUESTIONS.md. The build uses the "Build default" column until the client answers.

| # | Topic | Deck (26 Oct) | Written spec (31 Oct) | Build default |
|---|---|---|---|---|
| C1 | Fit for humans | No checkbox; all Overproduction is "for review" in the people listing | "Fit for humans" checkbox per Overproduction line; UAT-02 relies on it | **No checkbox (decided 18 Nov 2026, follows the deck).** All Overproduction is offered for the people listing; the kitchen lowers amounts there if part isn't suitable. The API field stays and the app always sends `true` for Overproduction. |
| C2 | Destination | Phone stepper step 3 "Choose destination"; not-fit listing has "Intended reuse: Animal feed / Bioenergy / Compost" chips | "Business is not asked to choose recovery destination" | No destination step or chips. Stepper: Select sources · Add quantities · Review · List |
| C3 | "Wasted / landfill" | Insights card and bar show landfill kg | "Do not imply all uncollected food was disposed of without evidence" | Card reads **Not recovered**, with a status breakdown; no landfill wording |
| C4 | Cluster filter | Not shown | Listed | Shown only if the organisation has clusters |
| C5 | Spoilage categories | Prepared meals, Fruit & vegetables, Meat & poultry, Bakery, Dairy, Seafood, Pantry items, Other | Fruit & veg, Dairy, Meat & Poultry, Seafood, Bread & baked goods | Deck list (it is a superset) |
| C6 | Preparation categories | Peels & trimmings, Meat offcuts, Bones, Shells, Coffee grounds, Preparation mistake | Adds Bread & baked goods and "other V11 options" | Deck list + Bread & baked goods + Other |
| C7 | Bakery vs Bread / Baked goods | Recording says "Bakery"; the listing demo shows Bread and Baked goods | — | Record "Bakery"; list it as "Baked goods" |
| C8 | Not-fit listing contents | Shows Overproduction items too | "Remaining non-edible recorded items" (UAT-07 = 9 kg, which includes unticked Beef) | Every line that isn't fit, including unticked Overproduction |

## 3. Scope

| In (by 20 Nov) | Out |
|---|---|
| Home: Make Food Count card + impact tiles | Selling flows (More to Sell, Saveful Saver) |
| Source selection; one tab per selected source | Forecasting, AI food recognition |
| Per-line kg; meat and seafood subtypes with group totals; Fit for humans on Overproduction | Automatic receiver allocation; business-chosen destination |
| Summary with three actions | New external integrations |
| Prefilled people and not-fit listings through the existing screens | New notification types |
| Food Impact insights: three views, filters, category drill-down | |
| Phone portrait **and** tablet landscape | |

## 4. What already exists and is reused

| Need | Existing piece |
|---|---|
| People listing | `CreateListingScreen` (3 steps, HUMAN) |
| Not-fit listing | `CreateFarmListingScreen` (ANIMAL / not fit for human consumption) |
| Surplus entry | `SurplusScreen` (List Surplus chooser) |
| Food icons | `resolveFoodIconSource` / `FoodIconKey` (`src/utils/foodListing.ts`) |
| Impact factors | `estimateMealsSaved`, `estimateCo2AvoidedKg` |
| Double-tap guard | `useSubmitLock` |
| Responsive helpers | `useResponsiveLayout`, `buildFormShellStyles` (`src/utils/dashboardAdaptive`) |
| UI kit | `src/components/consolidated/ui.tsx` (Surface, SectionTitle, Chip, Segmented, StatGrid, ProgressBar, StepTrack, Notice, EmptyState, SkeletonCard, ActionButton, HeaderAction, `cc` tokens); `meta` typography |
| Split-bar + legend pattern | `ConsolidatedReportScreen` |
| Dev fixtures pattern | `src/dev/consolidatedPreview.tsx` + `previewFlag.ts` |

## 5. Look and feel

- **Same kit and spacing as Consolidated Collections.** Don't add new button, card or chip styles.
- **From the deck:**
  - Make Food Count screens have a **dark purple header** (`palette.eggplant` #4B2176) carrying the current site name and a switcher (the "Compass Kitchen ▾" in the deck).
  - Screen titles are in purple.
  - The main buttons are purple pills: "Next food source →" and "Review food summary →".
  - Each section sits on a light lilac panel.
  - Every food row has an illustration.
- **The existing listing screens keep their green "Today's Surplus" header.** The deck shows them that way.
- **Colours for the summary actions:**

  | Action | Colour |
  |---|---|
  | People | Green: `palette.kale` with a light green fill |
  | Not fit | Orange: `palette.orange` with a light orange fill |
  | Save | White |
- **Images:** the client's Drive folder icons go into `assets/make-food-count/` (sources and food rows). Until they arrive, use the existing food icons.
- **Tablet landscape:**
  - Home cards sit side by side, with four impact tiles in one row.
  - Recording uses the full width, with the per-source summary under the table and buttons at both ends.
  - Summary actions sit in two columns.
  - Insights has three overview cards in a row, with "Where did the food go?" and "Destinations" side by side.
- **Phone:** one column; the buttons stay at the bottom.
- **Orientation:** `RestaurantStack` locks portrait. Make Food Count screens (and the listing screens when opened from Make Food Count) use `orientation: 'default'`. Before release, check `app.json`: `orientation`, `ios.supportsTablet` and `ios.requireFullScreen`.

## 6. Screens (client IDs, matched to the deck)

**MFC-001 Home** (existing Home, green header)

- New card above "Got surplus food?":
  - "Today's Waste" pill
  - title **Make Food Count** (a "NEW" badge on tablet)
  - text "Record food waste, understand where it comes from and choose the best next step"
  - illustration
  - purple button **Record Food Waste →**
- If a draft exists, the button reads **Continue recording →**.
- "Got surplus food?" card: **remove the small icon in the white box** over its illustration (deck note). The green **List Surplus →** button is unchanged.
- "Your impact so far" tiles: **Food recorded**, **Food diverted** (renamed from "Food saved"), **Collections**, **CO₂ avoided**. Below them, the link **View detailed insights →** opens Food Impact.

**MFC-002 Select sources**

- Purple header with the back arrow and the title "Make Food Count".
- Phone stepper with four steps: Select sources · Add quantities · Review · List.
- Title "What sources of food waste do you have?" with the line "Select all that apply. You can record several sources in one session."
- Four image tiles, each with a title, a description and an example line:

| Tile | Description | Example line |
|---|---|---|
| Overproduction | Food prepared or cooked but not used | cooked meals, baked goods, prepared ingredients |
| Spoilage | Food that has gone off or is no longer safe to eat | expired fresh produce, damaged packaging |
| Preparation | Peels, trimmings, offcuts and preparation mistakes | vegetable peelings, meat offcuts, bones, shells, coffee grounds |
| Plate Scraps | Food left on plates after service | uneaten meals, plate returns |

- Tile layout: phone one column, tablet two by two.
- The button reads **Continue (n selected) →** and is disabled at 0.

**MFC-003 to 006 Record a source** (one screen; the source tabs switch the content)

- The breadcrumb "Make Food Count / Add food items & quantities / k of n".
- A chip row with only the selected sources. The current chip is outlined in purple, and finished ones are green with ✓.
- Title **Record <Source>**, then a subtitle (Overproduction adds: "All Overproduction quantities will be offered for review in the people listing, where you can edit the amounts.").
- A panel with the source image and description, and a table headed **Food item · Quantity (kg)**. Overproduction adds a third column, **Fit for humans**, with the heading shown once.
- Meat & poultry and Seafood are group headings with "Enter each type separately" and indented subtype rows. Each group shows its **group total** row.
- "<Source> summary · Total <Source> · X kg" panel.
- Overproduction only, a lilac notice: "These are recorded quantities, not a declaration that the food is safe to donate. You can adjust the quantities when preparing the people listing; food safety is checked before publication."
- Buttons: **‹ Back** (light) and **Next food source →**. On the last selected source it reads **Review food summary →**.
- Inputs use a decimal keypad, show "0" as a placeholder (not a value), and show errors inline under the field.

**MFC-007 Food summary**

- The link "‹ Back to recording" and the title **Food summary**.
- The intro line: "Review the food recorded. Overproduction is shown as potentially available for people, subject to your review and food safety checks during listing. Other recorded sources are shown separately."
- A table with columns **Food source · Total recorded · For people (Overproduction) · Other recorded food**. It has one row per selected source and a lilac **Total** row. Tapping a row opens that source's tab.
- **What would you like to do next?** has three action cards:

| Card | Shows | When |
|---|---|---|
| Green **List surplus for people** | "X kg available" | Disabled at 0 |
| Orange **List surplus not fit for human consumption** | "X kg available" | Disabled at 0 |
| White **Save record without listing** | "Keep a record only" | Always |

- After a listing is published, its card shows the status instead ("Listed 7 kg · Waiting for a claim", "Collected 4 of 7 kg"). The other card stays usable.
- Footer notice: "Food is not counted as recovered until collection is verified."

**MFC-008 List surplus for people** (existing `CreateListingScreen`, prefilled)

- Green banner: "✓ Items from Make Food Count have been carried forward. Adjust quantities below if only part of the food is suitable."
- Each item row shows "Counted: X kg" under the name, and its quantity can't go above that.
- Every existing step, validation and declaration stays as it is.
- On success it returns to the Summary, not the generic confirmation.

**MFC-009 List surplus not fit for human consumption** (existing `CreateFarmListingScreen`, prefilled)

- Same banner, rows and limits as the people listing.
- **No "Intended reuse" chips** (C2). Returns to the Summary.

**MFC-010 Food Impact** (opened from the Insights tab and from Home "View detailed insights")

- Title **Food Impact** with the subtitle "<Organisation> · Food insights and recovery outcomes".
- A filter card titled "Filter <Organisation> results" with **Clear filters**. It holds:
  - Reporting period (presets: This week, This month, Last 3 months, Custom)
  - From and To
  - Group ("Business unit")
  - Territory ("Geography")
  - Cluster (if any)
  - Site

  The options cascade and are limited to what the user may see. One filter state is shared by all three views.
- Segmented control: **Impact overview · What happened to the food? · Food redistributed**.

| View | Contents |
|---|---|
| Impact overview | Three cards: Total food recorded · Redistributed / recovered (green) · Not recovered (lilac) (C3). "Where did the food go?" split bar with legend. "Redistribution destinations": Charity donations, Animal feed, Compost / organics, Bioenergy, with kg and % of recovered. "Breakdown by category": four source rows with image, "X kg total · Y kg recovered · Z kg not recovered" and a chevron to the source drill-down |
| What happened to the food? | Recorded → listed → claimed → collected, plus the not-recovered breakdown: Not listed / Listed, not claimed / Expired / Cancelled / Claimed, not collected |
| Food redistributed | By destination, by food category, by site, and a trend over time |

- Source drill-down screen: categories in that source, recovered vs not recovered, and destinations.
- Empty states throughout. Production never shows an "Illustrative demo data" badge or demo figures.

## 7. Food rows (proposed final, confirm with client)

Keys are stable; the backend serves labels and image keys (`GET /mfc/taxonomy`).

| Source | Rows | Shows on listing as |
|---|---|---|
| Overproduction | Prepared meals · Fruit & vegetables · **Meat & poultry** → Chicken, Beef, Lamb, Pork, Other · Bakery · Dairy · **Seafood** → Fish, Shellfish, Other · Pantry items · Other | "Prepared meals", "Fresh fruit & veg", "Meat · Chicken", "Baked goods", "Dairy", "Seafood · Fish", "Pantry items", "Other" |
| Spoilage | Prepared meals · Fruit & vegetables · Meat & poultry · Bakery · Dairy · Seafood · Pantry items · Other | as recorded |
| Preparation | Peels & trimmings · Meat offcuts · Bones · Shells · Coffee grounds · Bread & baked goods · Preparation mistake · Other | "Fruit & vegetable peelings", "Meat offcuts", … |
| Plate Scraps | Mixed plate scraps (one row) | "Mixed plate scraps" |

**Quantity rules:**
- Kilograms, with up to 2 decimals.
- A saved line must be more than 0. A blank field means "not entered", not a saved 0.
- Rejected with inline text: negative, not a number, more than 2 decimals, or more than **500 kg** per line (to confirm).

## 8. App behaviour rules

1. **Nothing lost:**
   - The open record lives in a persisted zustand store (AsyncStorage), keyed by a `clientRequestId` (uuid). Lines are keyed by a stable `clientKey`.
   - Autosave runs 800 ms after the last change, and also on tab switch, when the app goes to the background, and when leaving the screen.
   - When the app starts with an unsynced draft, offer "Continue recording".
2. **Offline:** show "Saved on this phone, will sync" and retry with backoff. Creating a record is idempotent on the server, so retries can't make duplicates.
3. **Conflict (409):** reload the server copy and show a Notice saying someone else updated the record.
4. **Edit limits after listing:** the server enforces them. The app shows the server's message inline (for example "7 kg of this line is listed: edit or cancel the listing first").
5. **No duplicate listings:** `useSubmitLock` plus an `Idempotency-Key` header on publish.
6. **Accessibility:**
   - Every input is labelled, for example "Chicken, kilograms" and "Chicken, fit for humans".
   - Images have alt text.
   - Errors are announced.
   - Touch targets are at least 44pt.

## 9. Timeline

There are four working days (Mon 16 – Fri 20 Nov). The plan is in [MILESTONES.md](MILESTONES.md).

If the client's answers are late, these can follow shortly after release:
- the Insights trend and site breakdown in the third view;
- the category drill-down screen;
- polishing the tablet layout.
