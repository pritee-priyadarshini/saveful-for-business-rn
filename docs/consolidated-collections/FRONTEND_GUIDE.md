# Consolidated Collections — Mobile App Implementation Guide (saveful-for-business-rn)

> Read `docs/consolidated-collections/SPEC.md` first (same folder). This guide gives the **step-by-step
> build order** for the React Native app. Do the steps in order; each ends with an **Acceptance** check.
> The backend guide lives in the backend repo: `svforb/docs/consolidated-collections/BACKEND_GUIDE.md`.
>
> Stack facts (verified in this repo):
> - Expo 54 / RN 0.81, React Navigation 6 (native-stack + bottom-tabs), Zustand stores, axios `src/services/api.ts`
>   (`baseURL https://s4b.saveful.app/api/v1`), path alias `@/` → `src/`
> - Root stack: `src/navigation/AppNavigator.tsx` (`RootStackParamList` at line ~73, screens at ~450–485)
> - Business tabs: `src/navigation/RoleTabs.tsx` — Home is `RestaurantHomeScreen` (single) or `ManageSitesScreen` (multi);
>   Listings → `RestaurantStack` (`src/navigation/RestaurantStack.tsx`)
> - Listing flow: `SurplusScreen` (List Surplus; already has a chooser sheet `chooseOpen` for Preferred Charity
>   connections) → `CreateListingScreen` (3 steps: Food Details / Collection Logistics / Confirm Listing) → `ListingConfirmationScreen`
> - Account: `src/screens/shared/ProfileScreen.tsx` (rows "Connections", "Manage Access" ~line 950)
> - Manage Access: `src/screens/restaurant/ManageAccessScreen.tsx`
> - Charity collect: `claimsService.markClaimCollected` is called in `CharityPickupScreen.tsx` (~200),
>   `CharityUpdatesScreen.tsx` (~210), `components/SelfPickupClaimsSection.tsx` (~55), and the charity
>   `components/postCollectSurveyModal.tsx` (~204)
> - Claim modal: `src/components/ClaimConfirmModal.tsx` (`claimMode: 'FULL' | 'PARTIAL'`)
> - Push routing: `src/services/pushNotifications.ts` (`NotificationNavigationTarget`, deep-link resolution ~580–780)
> - Reusable UI: `Screen`, `StackHeroHeader`, `HeroHeader`, `Card`, `Button`, `AppText`, `InputField`, `StatusBadge`,
>   `ConfirmModal`, `SavefulModal`, `AppDateTimePicker`, `WhiteSelect`, `PlacesSearchInput`, `SectionHeader`, `Skeleton`,
>   `CollectionNotesCard`, `ListingPhotoGallery`; theme in `src/theme/*` (`palette`, spacing, typography); `useAsyncAction`, `useSubmitLock`
>
> **Rules**
> 1. Reuse existing components and styles. Match the look of `ConnectionsScreen` / `ConnectionDetailScreen` (closest
>    existing "scheduled operations" UI). The Canva reference: https://canva.link/zbrruehmugncm5c
> 2. No new bottom tab. Entry points only: Account (setup), Home card (operations), List Surplus (sites), Listings (handover),
>    Insights (reports).
> 3. **Charity screens must never show** "consolidated", "cluster", "group" or outlet names. The only signal is
>    `requiresItemCheck: true` from the API.
> 4. All timestamps for handover/receipt come from the server; never send device time.
> 5. Show times in the collection's `timezone` (use the existing `utils/dateFormat.ts` helpers; add a tz-aware formatter if needed).
> 6. Don't grow the giant screens further than needed: put new UI in new components under `src/components/consolidated/`
>    and branch minimally inside `CreateListingScreen`, `RestaurantListingsScreen`, etc.

---

## F0. Files to create

```
src/types/consolidated.ts                    # all TS types mirroring SPEC §7
src/services/consolidated.service.ts         # API calls (SPEC §7)
src/services/consolidated.mock.ts            # mock responses (F2), removed after backend is live
src/store/consolidatedStore.ts               # zustand: me, groups, collections cache, open collections per site
src/hooks/useConsolidatedAccess.ts           # { canManage, isReceiver, loading } from /consolidated/me
src/utils/consolidated.ts                    # labels, status colours, method copy, time-order validation, formatters
src/components/consolidated/
  CollectionStatusBadge.tsx                  # wraps StatusBadge with collection/contribution status map
  CollectionTimesCard.tsx                    # handover window, deadline, pickup window (method-aware)
  ConsolidatedLogisticsCard.tsx              # read-only logistics for step 2 of CreateListing
  DeclarationCheckbox.tsx                    # text + mandatory checkbox (used by site/manager/charity)
  MethodSelector.tsx                         # SITE_DROP_OFF | INTERNAL_COLLECTION cards
  RecurrencePicker.tsx                       # one-off/daily/weekly/weekdays/custom dates
  SiteMultiSelect.tsx  UserMultiSelect.tsx
  ContributionRow.tsx                        # dashboard row
  ReceiptSheet.tsx                           # Received / Not received / Adjust quantity
  QuantityInput.tsx                          # kg numeric input with +/- (reuse InputField)
  HandoverButton.tsx                         # "Confirm food dropped off" / "Confirm food collected"
  PendingChangeBanner.tsx                    # charity-side neutral "Pickup changed — review"
src/screens/consolidated/
  ConsolidatedGroupsScreen.tsx               # CM1 list           (Account → Consolidated Collections)
  ConsolidatedGroupFormScreen.tsx            # CM1 create/edit
  ConsolidatedCollectionsScreen.tsx          # H1 list (Upcoming / Active / Past) + "Schedule collection"
  ScheduleCollectionScreen.tsx               # CM2 create/edit schedule or single occurrence
  CollectionDashboardScreen.tsx              # CM3
  ReviewPublishScreen.tsx                    # CM4
  ContributionDetailScreen.tsx               # site view of own contribution (+ manager view)
  ConsolidatedReportScreen.tsx               # RP1
src/screens/charity/PickupCheckScreen.tsx    # CH3 item check (neutral name on purpose)
```

---

## F1. Types and service

### F1.1 `src/types/consolidated.ts`
Mirror SPEC §7 exactly. Minimum:
```ts
export type HandoverMethod = 'SITE_DROP_OFF' | 'INTERNAL_COLLECTION';
export type Recurrence = 'ONE_OFF' | 'DAILY' | 'WEEKLY' | 'SELECTED_WEEKDAYS' | 'CUSTOM_DATES';
export type CollectionStatus = 'SCHEDULED' | 'OPEN' | 'SUBMISSIONS_CLOSED' | 'PUBLISHED' | 'CLAIMED'
  | 'AWAITING_ITEM_CHECK' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
export type ContributionStatus = 'SUBMITTED' | 'LATE_PENDING_APPROVAL' | 'REJECTED_LATE' | 'WITHDRAWN'
  | 'HANDED_OVER' | 'RECEIVED' | 'NOT_RECEIVED' | 'EXCLUDED' | 'NO_CONTRIBUTION' | 'COMPLETED' | 'CANCELLED';
export type ReceiptStatus = 'PENDING' | 'RECEIVED' | 'NOT_RECEIVED';
export type RejectionReason = 'QUALITY' | 'TEMPERATURE' | 'PACKAGING_DAMAGED' | 'PAST_DATE'
  | 'NOT_AS_DESCRIBED' | 'CANNOT_TRANSPORT' | 'CANNOT_STORE' | 'OTHER';
export type Declaration = { version: string; text: string };
export type ConsolidatedMe = { canManage: boolean; managedGroupIds: number[]; receiverGroupIds: number[]; siteIdsWithOpenCollections: number[] };
export type CollectionPoint = { id: number; name: string; address: string; postcode?: string|null; lat: number; lng: number; directions?: string|null; isDefault?: boolean; isActive?: boolean };
export type ConsolidatedGroup = { id: number; name: string; description?: string|null; hostSite: {id:number;name:string}; timezone: string;
  points: CollectionPoint[]; sites: {id:number;name:string;removedAt?:string|null}[];
  managers: {id:number;name:string}[]; receivers: {id:number;name:string}[]; isActive: boolean;
  siteCount?: number; nextCollection?: { id:number; scheduledDate:string; status:CollectionStatus } | null };
export type OpenCollection = { id:number; groupName:string; point:{name:string;address:string}; method:HandoverMethod;
  scheduledDate:string; submissionsCloseAt:string; handoverStartAt:string; handoverEndAt:string;
  pickupStartAt:string; pickupEndAt:string; suitabilityNotes:string; instructions?:string|null; lateAllowed:boolean; timezone:string };
export type CollectionDashboard = /* exactly SPEC §7.6 */ any; // write it out fully, do not leave `any`
export type ItemCheckPayload = { items: { masterFoodItemId:number; acceptedQtyKg:number; rejectedQtyKg:number; unavailableQtyKg:number; rejectionReason?:RejectionReason; rejectionNote?:string }[];
  declaration: { version:string; accepted:true }; rating?: number; ratingNote?: string };
```
Also extend the existing types (non-breaking, all optional):
- `FoodListing` / `ListingDetail` in `foodListing.service.ts`: `consolidatedRole?: 'STANDARD'|'CONTRIBUTION'|'MASTER'`,
  `requiresItemCheck?: boolean`, `consolidated?: { contributionId:number; collectionId:number; status:ContributionStatus; method:HandoverMethod; pointName:string; handoverEndAt:string; timezone:string }`
  (the backend adds `consolidated` to **business** listing payloads for contribution listings — confirm with backend B9; if it's
  absent, fetch `GET /consolidated/contributions/by-listing/:listingId`).
- `FoodItem` / `CreateFoodItemPayload`: `quantityDescription?: string`.
- Claim types in `claims.service.ts`: `requiresItemCheck?: boolean; itemCheckDone?: boolean; pendingChangeId?: number|null`.

### F1.2 `src/services/consolidated.service.ts`
One function per endpoint in SPEC §7, grouped like `connections.service.ts`:
`getMe, getDeclarations, getPermissions, setPermission, listGroups, createGroup, getGroup, updateGroup, archiveGroup,
setGroupSites, setGroupMembers, addPoint, updatePoint, getEligibleSites, getEligibleUsers, createSchedule, getSchedule,
updateSchedule, endSchedule, listCollections, getCollection, updateCollection, cancelCollection, closeSubmissions,
reopenSubmissions, remindSites, getPublishPreview, publish, getAudit, getOpenCollectionsForSite, createContribution,
getContribution, getContributionByListing, updateContribution, withdrawContribution, confirmHandover, recordReceipt,
excludeContribution, approveLate, rejectLate, listChangeRequests, approveChangeRequest, rejectChangeRequest,
getItemCheck, acknowledgeChange, submitItemCheck, getReportSummary, getReportCollections`.

`createContribution` must support photos exactly like `foodListingService.createListing` does (reuse `uploadListingPhotos`
→ send `photoUrls`; JSON body). Errors: let them throw; screens use the existing `showErrorAlert` / `utils/apiError.ts`.

### F1.3 Store and access hook
- `consolidatedStore.ts`: `me`, `declarations`, `groups`, `collectionsByTab`, `openBySite: Record<siteId, OpenCollection[]>`,
  `dashboard: Record<id, CollectionDashboard>`, with `fetchX(force?)` actions, and a `reset()` called on logout (hook into the
  same place other stores reset — see `AppContext.tsx` / `authStore.ts` logout).
- `useConsolidatedAccess()`: loads `me` once per session (refresh on app focus is optional). Returns
  `{ canManage, isReceiver: receiverGroupIds.length>0, hasAccess: canManage || isReceiver, loading }`.
  Only call for business orgs (`restaurant_single`, `restaurant_multi`). For other roles return all false without calling the API.
- If the API returns 404 (feature flag off), treat it as no access and hide every entry point.

**Acceptance:** `npm run typecheck` passes.

---

## F2. Mock mode (build UI before the backend is ready)

`consolidated.mock.ts` exports the same functions with static data: 1 group "Melbourne Park Precinct" (Kiosk 1, Kiosk 2,
Corporate Suite; point "Loading Dock B"), 3 collections (OPEN today, PUBLISHED tomorrow, COMPLETED last week), and a
dashboard in every status. In `consolidated.service.ts`:
```ts
const USE_MOCKS = __DEV__ && process.env.EXPO_PUBLIC_CONSOLIDATED_MOCKS === '1';
```
Delete the mock file once the backend is on staging (F12).

---

## F3. Navigation registration

In `AppNavigator.tsx`, add to `RootStackParamList` and register (inside the same authenticated block as `Connections`):
```ts
ConsolidatedGroups: undefined;
ConsolidatedGroupForm: { groupId?: number } | undefined;
ConsolidatedCollections: { groupId?: number; tab?: 'upcoming'|'active'|'past' } | undefined;
ScheduleCollection: { groupId?: number; scheduleId?: number; collectionId?: number; mode: 'create'|'editSeries'|'editOccurrence' };
CollectionDashboard: { collectionId: number };
ReviewPublish: { collectionId: number };
ContributionDetail: { contributionId?: number; listingId?: number };
ConsolidatedReport: { groupId?: number } | undefined;
PickupCheck: { claimId: number };
```
In `RestaurantStack.tsx`, change `CreateListing: undefined` → `CreateListing: { consolidatedCollectionId?: number } | undefined`.
Add the push targets to `NotificationNavigationTarget` in `pushNotifications.ts` (F11).

**Acceptance:** typecheck passes; every new screen renders a placeholder.

---

## F4. Permission toggle (Manage Access) — SPEC §7.1, R1, A1

`ManageAccessScreen.tsx` (restaurant): for the org owner only (`authUser.orgRole === 'SUPER_ADMIN'`), show a section
"Consolidated Collections" listing `getPermissions()` users with a Switch "Can manage collections". Only eligible users
(Org Admin, or Site Admin of any site) get an enabled switch; others show helper text "Make this user a Site Admin first".
Use the existing list/row styles from this screen. Optimistic toggle with rollback on error.

**Acceptance:** the owner toggles a Site Admin on → that user's `/consolidated/me` returns `canManage: true` after re-login/refresh.

---

## F5. Setup: Account → Consolidated Collections (A1, CM1) — SPEC §7.2

### F5.1 Entry
`ProfileScreen.tsx`: below "Connections", if `useConsolidatedAccess().canManage` → row "Consolidated Collections" (icon
`git-merge-outline` or `cube-outline`) → `navigate('ConsolidatedGroups')`.

### F5.2 `ConsolidatedGroupsScreen`
- Header via `StackHeroHeader` "Consolidated Collections"; subtitle "Groups of sites that share a collection point".
- Cards: name, "N sites · Loading Dock B", next collection date or "No upcoming collections", inactive badge if archived.
- Empty state with an illustration from `assets/` and a button "Create group".
- Actions: tap → `ConsolidatedGroupForm {groupId}`; FAB/button "Create group"; secondary link "Go to collections" →
  `ConsolidatedCollections`.

### F5.3 `ConsolidatedGroupFormScreen` (create/edit, one scroll form, save at the bottom)
Sections:
1. **Details:** Name (required, ≤80), Description (optional).
2. **Collection point:** Name (e.g. "Loading Dock B"), Address via `PlacesSearchInput` (fills address/postcode/lat/lng),
   Directions (multiline, optional). Edit mode: list the points + "Add another point" (`addPoint`); toggle active per point.
3. **Participating sites:** `SiteMultiSelect` from `getEligibleSites(groupId)`; at least 1. "Host site" picker (`WhiteSelect`) from
   the selected sites, with helper "Used as the owner of the charity listing".
4. **People:** Managers (`UserMultiSelect`, only users with `canManage`; the creator is preselected and locked), Receivers
   (any org user) with helper "Can confirm food received at the collection point".
5. Save → `createGroup` / `updateGroup` + `setGroupSites` + `setGroupMembers` (edit mode calls only what changed).
   Return to `ConsolidatedGroups` (SPEC return path).
6. Edit mode footer: "Archive group" (ConfirmModal; show the backend 409 message if active collections exist).

Validation messages inline (reuse the `InputField` error prop).

**Acceptance:** create a group with 3 sites, edit it to remove one, archive it; a Site Admin sees only their sites in the picker.

---

## F6. Operations: Home → Consolidated Collections (H1, CM2) — SPEC §7.3

### F6.1 Home shortcut
In **both** `RestaurantHomeScreen.tsx` (single) and `ManageSitesScreen.tsx` (multi Home), if `hasAccess`:
a `Card` "Consolidated Collections" showing "Today: Loading Dock B · 2 pm · 3/5 sites listed" (from
`listCollections({tab:'active'})`, first item) or "No collections today", and a button → `ConsolidatedCollections`.
Place it near the existing Connections card (`RestaurantHomeScreen` ~line 666). Keep it compact.

### F6.2 `ConsolidatedCollectionsScreen`
- Segmented control Upcoming / Active / Past (reuse the filter chip style from `components/filters`).
- Optional group filter (`WhiteSelect`) when the user manages more than 1 group.
- Row: date + pickup window, group name, point name, `CollectionStatusBadge`, progress "4/6 sites", kg verified.
- Tap → `CollectionDashboard`. A "Schedule collection" button appears only if `canManage` → `ScheduleCollection {mode:'create'}`.
- Pull to refresh; paging like `RestaurantListingsScreen`.

### F6.3 `ScheduleCollectionScreen` (CM2) — a single scroll form in 4 sections
1. **Where:** group (`WhiteSelect`; preselected if passed), collection point (points of the group), participating sites
   (default all; `SiteMultiSelect` limited to the group's sites).
2. **How (method):** `MethodSelector` two cards:
   - "Sites drop off food" — "Each site brings its food to the collection point."
   - "Staff collect from sites" — "Your staff collect food from each site and bring it to the collection point."
   Helper: "Applies to all sites in this collection."
3. **When:**
   - `RecurrencePicker`: One-off (date) / Daily (start date, optional end) / Weekly (weekday, start, end) /
     Selected weekdays (chips Mon–Sun, start, end) / Custom dates (multi-date picker using `AppDateTimePicker`
     in date mode, adding chips).
   - Times (`AppDateTimePicker` time mode), labels depend on the method:
     | Field | SITE_DROP_OFF label | INTERNAL_COLLECTION label |
     |---|---|---|
     | `submissionsClose` | "Sites must list food by" | "Sites must list food by" |
     | `handoverStart` | "Drop-off opens" | "Food ready by" |
     | `handoverEnd` | "Final drop-off deadline" | "Internal collection ends" |
     | `pickupStart` / `pickupEnd` | "Charity pickup window" | same |
   - Validate order client-side with `utils/consolidated.ts#validateTimes` (SPEC A6) and show inline errors; the backend
     re-validates.
   - "Open for listing" (optional, advanced): same day (default) / 1–7 days before.
4. **Details:** contact name + phone (prefill from the user profile), instructions (multiline), food suitability requirements
   (required, multiline, placeholder "e.g. Chilled food must stay below 5°C; packaged and labelled").
- Submit → `createSchedule` → toast "Collection scheduled" → `CollectionDashboard` of the first generated collection (or back to the
  list if the first is in the future — go to the list with tab 'upcoming').
- Modes: `editSeries` (from the dashboard menu "Edit series") → `updateSchedule`, confirm dialog "Changes apply to future
  collections that haven't closed yet". `editOccurrence` → `updateCollection`; if status is CLAIMED, show a warning
  "The charity will be notified and asked to confirm" before submitting.

**Acceptance:** schedule a weekly Friday collection; the list shows the next two Fridays; editing the series time updates them;
invalid time order shows an error without calling the API.

---

## F7. Collection dashboard and publishing (CM3, CM4) — SPEC §7.5, §7.6

### F7.1 `CollectionDashboardScreen`
Data: `getCollection(id)` (poll every 30 s while focused and status in OPEN/SUBMISSIONS_CLOSED/PUBLISHED/CLAIMED;
also refresh on push for this collection).

Layout (top → bottom):
1. Header: date, group, point, `CollectionStatusBadge`, method label.
2. `CollectionTimesCard` (method-aware labels; "Closes in 45 min" countdown while OPEN; shows "Reopened until …").
3. Summary tiles (reuse the Insights tile style): Sites listed `submitted/participating`, Handed over, Received, kg submitted vs verified.
   **Never** show handed-over as received.
4. **Primary action button**, depending on status and permissions:
   | Status | Button |
   |---|---|
   | OPEN | "Close submissions now" (ConfirmModal mentions sites without food) |
   | SUBMISSIONS_CLOSED | "Review & publish" → `ReviewPublish` (disabled with `publishBlockers[0]` as helper text) |
   | PUBLISHED | "Waiting for a charity" (info) |
   | CLAIMED | charity name + pickup time + driver status if any; "Pickup in 25 min" |
   | AWAITING_ITEM_CHECK | "Waiting for the charity to confirm items" |
   | COMPLETED | totals accepted/rejected/unavailable → "View report" |
5. Pending items: late contributions (Approve / Reject with reason) and change requests (show diff summary; Approve / Reject).
6. Contributions list: `ContributionRow` per site — site name, status badge, kg submitted/verified, handover time + person,
   receipt status, exceptions chips (Late, Overdue, Not received, Changed). Tap → expands items (name, category,
   descriptive quantity, kg, best-before, storage icons, allergens). Row actions (permission-based):
   - Receiver/manager: "Record receipt" → `ReceiptSheet`.
   - Manager: "Exclude" (reason required).
7. "No contribution" section listing `sitesWithoutContribution` + a "Send reminder" button (`remindSites`).
8. Overflow menu (header right): Edit this collection, Edit series, Reopen submissions (time picker ≤ handover end), Cancel collection
   (reason required, ConfirmModal "Sites and any charity will be notified. Food listed won't become direct listings."), View audit
   (simple list screen or modal from `getAudit`).

### F7.2 `ReceiptSheet` (SavefulModal bottom sheet)
- Three options: **Received** (all items as listed), **Adjust quantity** (shows each item with a `QuantityInput` prefilled with
  the submitted kg; max = submitted; 0 allowed), **Not received**.
- Optional note. Submit → `recordReceipt`. Disable while submitting (`useSubmitLock`).

### F7.3 `ReviewPublishScreen` (CM4)
- `getPublishPreview(id)`.
- Blockers (red list) → disable publish. Warnings (amber list), e.g. "Kiosk 3 did not contribute".
- "What the charity will see" preview card, built with the **same component the charity Available card uses**
  (`ListingCard` / `DiscoverListingDetailModal` content) fed with preview data: point name, pickup window, items with kg, storage, allergens,
  notes. No site names in this preview.
- Internal breakdown (collapsed): per site, items and verified kg.
- `DeclarationCheckbox` with `declarations.MANAGER.text` (mandatory).
- "Publish to charities" → `publish` → success toast → back to the dashboard.

**Acceptance:** with mocks and with the backend: you cannot publish with blockers; after publish the dashboard shows PUBLISHED and
the charity account sees one listing.

---

## F8. Site listing flow (SM1–SM4)

### F8.1 Choose direct or collection — `SurplusScreen.tsx`
- On focus, for the selected site(s) call `getOpenCollectionsForSite(siteId)` (same place where `loadToday` loads connections).
- In `handleListSurplus` for the **food for people** card: if there are open collections **or** connections, open the existing chooser
  (`setChooseOpen(true)`). Add a new section to that chooser: "Shared collection" rows → `"Loading Dock B · Fri 13 Nov · list by 1:30 pm"`
  (+ "Late — needs approval" tag when `lateAllowed` and closed). Selecting a row →
  `navigation.navigate('CreateListing', { consolidatedCollectionId: id })`. Keep the existing "List to the network" option = direct.
- Livestock flow unchanged.

### F8.2 `CreateListingScreen.tsx` (minimal branching)
Read `route.params?.consolidatedCollectionId`. If set, load the collection (from the store `openBySite`) and:
- **Step 1 Food Details:** unchanged. Add an optional "Descriptive quantity (e.g. 3 trays)" input per item → `quantityDescription`.
- **Step 2 Collection Logistics:** render `<ConsolidatedLogisticsCard collection=… />` **instead of** the pickup address/time
  inputs (read-only: point name + address + directions, method sentence, handover window/deadline, charity pickup window,
  suitability requirements, instructions). **Keep** the storage, allergen, best-before, notes and photo fields. Skip the pickup-time
  validation (`listingDateValidation`) for those fields; keep the best-before validation and add a warning (not a block) if
  best-before < pickupEndAt: "This food may not be accepted — its best-before is before the pickup ends."
- **Step 3 Confirm:** summary + a collection summary block (point, handover deadline, suitability). Replace the existing
  "safe for donation" checkbox text with `DeclarationCheckbox` (`declarations.SITE`) — still mandatory.
- **Submit:** `consolidatedService.createContribution(collectionId, payload)` instead of `foodListingService.createListing`.
  The payload is the same minus pickup address/lat/lng/times, plus `siteId` (use the existing `resolveListingSiteId`) and `declaration`.
- On success → `ListingConfirmation` with `{ listing, consolidated: { method, pointName, handoverStartAt, handoverEndAt } }`.
  In `ListingConfirmationScreen`, if `consolidated` is present show: "Added to the shared collection at Loading Dock B. Drop off your food
  between 1:30 and 1:50 pm." (or "Staff will collect your food — have it ready by 1:30 pm.") Hide the "charities nearby will be
  notified" copy.
- If the backend returns late status (`LATE_PENDING_APPROVAL`), show "Sent for approval — your manager will confirm."

### F8.3 Your Listings — `RestaurantListingsScreen.tsx`
For a listing with `consolidatedRole === 'CONTRIBUTION'`:
- Badge "Shared collection · Loading Dock B" + `CollectionStatusBadge` for the contribution status (map: SUBMITTED "Listed",
  HANDED_OVER "Dropped off"/"Collected", RECEIVED "Received", NOT_RECEIVED "Not received", LATE_PENDING_APPROVAL "Awaiting approval",
  COMPLETED "Collected by charity", WITHDRAWN/CANCELLED "Cancelled").
- `HandoverButton` when status is SUBMITTED: label by method — "Confirm food dropped off" / "Confirm food collected"; ConfirmModal →
  `confirmHandover` → refresh. After success show "Dropped off at 1:42 pm by You".
- Hide the standard Relist/Cancel actions for contributions. Show "Edit" → `ContributionDetail {listingId}` (F8.4); show "Withdraw"
  only before publish.
- Tapping the card → `ContributionDetail`.

### F8.4 `ContributionDetailScreen`
- Load `getContributionByListing(listingId)` (or by id).
- Show the event info (`CollectionTimesCard`), status timeline (Listed → Handed over → Received → Collected) with server times and
  actors, items with submitted / verified / accepted / not accepted kg (once completed), and the receipt note.
- Actions: Handover (if pending), Edit (before publish → reuse the CreateListing form in edit mode is too heavy; instead open a
  simple item editor (name, category, kg, descriptive qty, add/remove) + flags → `updateContribution`), Withdraw (before publish).
  After publish, "Request a change" opens the same editor; the response `PENDING_APPROVAL` shows a banner "Change waiting for manager approval".
- Managers opening this screen see receipt/exclude actions too.
- Site users never see other sites.

### F8.5 Updates
`RestaurantUpdatesScreen` is derived from org listings (`utils/restaurantUpdates.ts#mapListingsToRestaurantUpdates`). Contribution
listings get allocation claims on completion, so "collected" cards appear automatically. Check that the card text uses the **charity
name and accepted kg** and doesn't crash on contributions. Add a small "Shared collection" tag to update cards whose listing has
`consolidatedRole === 'CONTRIBUTION'`. No other change.

**Acceptance:** as a site user — list into an open collection with **one extra tap** compared to a direct listing; the listing appears
in Your Listings with the badge; handover works once (a second tap is a no-op); it never appears in the charity Available tab.

---

## F9. Charity (CH1–CH3) — neutral UI only

### F9.1 Available / claim
- `DiscoverListingDetailModal` / `ClaimConfirmModal`: if `listing.requiresItemCheck` → force `claimMode = 'FULL'`, hide the partial
  quantity steppers and the Full/Partial toggle. Copy: "You'll collect all items listed." Nothing else changes.

### F9.2 Pickup and collection
In **every** place that calls `claimsService.markClaimCollected` for a charity (`CharityPickupScreen`, `CharityUpdatesScreen`,
`SelfPickupClaimsSection`):
```ts
if (pickup.requiresItemCheck && !pickup.itemCheckDone) {
  navigation.navigate('PickupCheck', { claimId: pickup.claimId });
  return;
}
```
The button label stays "Mark as collected" (or "Confirm items" if you prefer — no forbidden words).
If `pendingChangeId` → show `PendingChangeBanner` on the pickup card: "Your pickup has changed — review" → a modal with the
`summary` text and "Confirm" (`acknowledgeChange`) or "Cancel pickup" (existing cancel claim flow).
Driver pickups: after the driver completes, the claim shows `requiresItemCheck && !itemCheckDone` → the same "Confirm items" button.

### F9.3 `PickupCheckScreen` (CH3)
- `getItemCheck(claimId)`. If `pendingChange` → show it first and require acknowledgement.
- Header: point name, pickup window. List of items: name, category, descriptive quantity, kg listed.
- Per item, three numeric inputs that must add up to the listed kg: **Accepted**, **Not accepted**, **Not available**.
  Default: accepted = listed. Quick buttons: "Accept all", "None available". Show a live remaining counter and block submit
  until every item adds up (±0.01).
- If not accepted > 0 → reason picker (`WhiteSelect`) with labels: Quality, Temperature, Packaging damaged, Past date,
  Not as described, Can't transport, Can't store, Other (+ note, required for Other).
- `DeclarationCheckbox` with `declarations.CHARITY.text`.
- Submit → `submitItemCheck` → then open the existing charity `postCollectSurveyModal` for rating, with items = accepted quantities
  (the modal's `markClaimCollected` call is a no-op because the claim is already COLLECTED — backend B9.4).
  Alternatively pass the rating in the item-check payload and skip the modal; pick one and be consistent. **Recommended:** reuse the
  modal so ratings stay identical.
- Never show site/outlet names on this screen.

### F9.4 History / Impact
No change: the backend returns one master claim per pickup with the accepted kg and excludes the internal allocation claims.

**Acceptance:** as a charity — the listing looks like any other; a partial claim is impossible; collecting opens the item check;
totals must match; after submit the pickup shows as collected with the accepted kg; impact increases by the accepted kg only.
Run `grep -rniE "consolidat|cluster" src/screens/charity src/components/ClaimConfirmModal.tsx src/components/DiscoverListingDetailModal.tsx`
→ only code identifiers/comments, **no user-visible strings**.

---

## F10. Reporting (RP1) — SPEC §7.8

- `RestaurantAnalyticsScreen` (Insights): if `hasAccess`, add a row/card "Consolidated Collections report" → `ConsolidatedReport`.
  Site-level impact needs no change (allocations feed it).
- `ConsolidatedReportScreen`: filters (group, site, date range via the existing `ImpactDateFilter`, category). Show combined tiles
  (Listed, Verified, Accepted, Not accepted, Not available — kg) and a per-site table (site, collections, listed, verified, accepted,
  not accepted). Below: rejection reasons breakdown and the collections list (`getReportCollections`) → tap opens the dashboard.
- Optional export: reuse `ImpactReportDownload` patterns with `xlsx` if time allows (not required in Phase 1).
- Units: kg; if the org uses imperial, follow how existing Insights formats weights.

**Acceptance:** for the test scenario in BACKEND_GUIDE B10, the per-site rows show accepted 4 / 5 / 6 and a combined 15.

---

## F11. Push notifications and deep links

In `src/services/pushNotifications.ts`:
1. Extend `NotificationNavigationTarget` with
   `{ name: 'CollectionDashboard'; params: { collectionId: number } }`,
   `{ name: 'ContributionDetail'; params: { contributionId?: number; listingId?: number } }`,
   `{ name: 'PickupCheck'; params: { claimId: number } }`.
2. In the deep-link resolver, before the generic listing/updates checks:
   - `type` starts with `consolidated_` and `contributionId` → `ContributionDetail` (site-targeted types:
     `consolidated_scheduled`, `consolidated_closing_soon`, `consolidated_received`, `consolidated_not_received`,
     `consolidated_change_decided`, `consolidated_completed` for sites; for `consolidated_scheduled`/`closing_soon` without a contribution
     → open `Tabs → Listings → Surplus` so they can list).
   - Other `consolidated_*` with `collectionId` → `CollectionDashboard`.
   - `pickup_change` (charity) → `Tabs → Updates` (the pickup card shows the banner).
3. Make sure `isFoodListingNotification` doesn't treat `consolidated_*` as "new listing nearby" for business users.
4. On receipt in the foreground, refresh `consolidatedStore` dashboard/list if open.

**Acceptance:** tapping each notification type opens the right screen from a killed app and from the background.

---

## F12. QA script and cleanup

Manual test script (staging, 4 accounts: owner, Site Admin manager of Kiosk 1+2, staff of Kiosk 3, charity):
1. Owner grants the permission to the Site Admin (F4).
2. The Site Admin creates group "Test Precinct" with Kiosk 1+2 only (Kiosk 3 is not in their access → not shown). The owner adds Kiosk 3.
3. The owner schedules a one-off today, drop-off, close in 20 min, drop-off window 20–40 min, pickup 45–90 min.
4. Kiosk 1 and 2 list (one with a descriptive quantity); Kiosk 3 lists after close → late → the manager approves.
5. Handover from Kiosk 1 and 3; Kiosk 2 forgets → overdue push.
6. Receiver: Kiosk 1 Received, Kiosk 3 Adjust (lower), Kiosk 2 Not received.
7. Review & publish (try with a blocker first). The charity sees one listing at "Loading Dock B" with no outlet names.
8. The charity claims (full only). The manager edits the pickup time → the charity sees the change banner → acknowledges.
9. The charity collects → item check with 1 kg rejected (Packaging damaged) → rating modal.
10. Check: site Insights for Kiosk 1/3 increased by accepted kg; Kiosk 2 by 0; the charity Impact increased once; the report reconciles.
11. Repeat with a weekly schedule and cancel one occurrence; check the notifications.
12. Regression: a direct listing, a livestock listing, a Connection daily listing, a partial claim on a normal listing, and the driver flow
    all behave as before.

Cleanup: delete `consolidated.mock.ts` and the env flag; `npm run typecheck`; remove unused imports.

---

## Build order summary (checklist)

- [ ] F0 create files
- [ ] F1 types, service, store, access hook
- [ ] F2 mocks
- [ ] F3 navigation
- [ ] F4 Manage Access permission toggle
- [ ] F5 Account → groups list + form
- [ ] F6 Home card, collections list, schedule form
- [ ] F7 dashboard, receipt sheet, review & publish
- [ ] F8 List Surplus chooser, CreateListing branch, Your Listings handover, contribution detail, updates tag
- [ ] F9 charity: forced full claim, pickup check, change banner
- [ ] F10 report screen + Insights entry
- [ ] F11 push deep links
- [ ] F12 QA script, cleanup

Dependency on the backend: F4 needs B3; F5 needs B5; F6 needs B6; F7 needs B7–B9; F8 needs B8; F9 needs B9–B10; F10 needs B11;
F11 needs B12. Use mocks (F2) to build ahead.

> **Not in this app:** the Enterprise web portal (`Saveful-enterPrise`, Next.js) also needs manager screens (R3). They use the
> same API. Write a separate web guide when Phase 1 mobile is done.
