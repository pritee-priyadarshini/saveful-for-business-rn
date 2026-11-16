# Consolidated Collections — Step-by-step test guide

Follows the client's Canva deck (screen IDs CM, SM, CH, RP) end to end. Do the parts in order:
each part sets up the next. Tick **Expect** items as you go.

---

## Part 0 — Prepare the backend (once)

1. Deploy the latest `svforb` code.
2. Apply the new migration (additive only, safe):
   ```bash
   npx prisma migrate deploy        # applies 20261113000000_consolidated_site_invitations
   ```
   Never use `prisma migrate dev` against production.
3. Set `CONSOLIDATED_ENABLED=true` in the server environment and restart.
4. Check the logs for: `Scheduled consolidated sweep every 5m`.
5. Check the switch is on:
   ```bash
   curl -i https://<api-host>/api/v1/consolidated/declarations
   ```
   - **Expect** `401 Unauthorized` (on but needs login). A `404` means the flag did not reach the process.
6. Install the new app build (or run it in dev) — it must include this change set.

> The sweep runs every 5 minutes. It opens collections at their opening time, closes submissions at
> the deadline, sends reminders and expires missed pickups. If a status change "doesn't happen",
> wait up to 5 minutes and pull to refresh.

---

## Part 1 — Test accounts

Create these (or reuse existing ones) before you start.

| Who | Account | Role |
|---|---|---|
| **A** | Business owner | Org **Owner** of a multi-site business |
| **B** | Collection manager | **Org Admin** in A's organisation |
| **C** | Site 3 admin | **Site Admin** of Site 3 only |
| **D** | Site 1 staff | **Staff** at Site 1 |
| **E** | Receiver at the dock | Ordinary org member |
| **F** | Charity user | Charity org, located within pickup radius of the collection point |
| (G) | Driver | Optional — for the driver-pickup variant |

The business needs **3 sites**: Site 1 and Site 2 with **no Site Admin**, and Site 3 whose Site Admin is C.
That is what makes the invitation flow visible: B can add Sites 1–2 directly, but Site 3 must accept.

Keep a second phone or a simulator handy so you can switch users quickly.

---

## Part 2 — Permission (Canva CM1 prerequisite)

1. Log in as **A** → Account → **Manage Access**.
2. In **Consolidated Collections managers**, switch **B** on.
   - **Expect** the toggle stays on after leaving and returning.
   - **Expect** an ordinary member (e.g. E) cannot be switched on (disabled), because only Org Admins / Site Admins can manage.
3. Log in as **B** → Account.
   - **Expect** a row **Consolidated Collection Groups** directly under Manage Access.
   - **Expect** E and D do **not** see that row.

---

## Part 3 — Create the group + site invitations (Canva CM1)

1. As **B**: Account → Consolidated Collection Groups → **Create group**.
2. Fill in:
   - Name: `Stadium North`
   - Collection point: `Loading Dock B`, pick an address, directions `Rear gate`
   - Sites: Site 1, Site 2, Site 3; Host site: Site 1
   - Managers: B (locked on); Receivers: E
3. Tap Save.
   - **Expect** "1 site has been invited and will take part once they accept…".
   - **Expect** the groups list shows `2 sites taking part · 1 invited · Loading Dock B`.
4. Open the group again.
   - **Expect** Site 1 and Site 2 show "Taking part"; Site 3 shows "Invited — waiting to accept".
5. Log in as **C** (Site 3 admin).
   - **Expect** a push "Shared collection invitation" (tap it → opens Collection invitations).
   - **Expect** a green card on Home: "You have a collection invitation".
6. Tap the card. Check it shows the group name, Loading Dock B, number of sites, manager and inviter.
7. **Decline test**: tap Decline, enter a reason, confirm.
   - **Expect** B gets a push "Site declined your invitation" containing the reason.
   - **Expect** B's group form shows Site 3 unticked with "Declined — select to invite again".
8. **Re-invite**: as B tick Site 3 again → Save.
   - **Expect** "1 new site was invited"; C gets the invitation again.
9. As **C** tap **Accept**.
   - **Expect** "Invitation accepted"; the Home card disappears.
   - **Expect** B gets "Site joined your collection group".
   - **Expect** the group shows all 3 sites "Taking part".
10. **Security check**: log in as **D** (staff).
    - **Expect** no invitation card and no way to accept for any site.

---

## Part 4 — Home entry + schedule (Canva CM2)

1. As **B** → Home.
   - **Expect** a **Consolidated Collections** card under "Your impact so far".
   - **Expect** the 5 bottom tabs are unchanged.
2. Tap it → **Schedule collection**.
3. Fill in a **one-off for today**, method **Dropped off by sites**. Pick times a little in the future so you can walk through the day, for example (now = 10:00):

   | Field | Value |
   |---|---|
   | Sites must list food by | 10:30 |
   | Drop-off window opens | 10:00 |
   | Final drop-off deadline | 11:00 |
   | Charity pickup window | 11:15 – 18:00 |

   - Contact name / phone: any
   - Suitability requirement: `Sealed, labelled, chilled`
   - Participating sites: all 3

   Times are in the group's timezone (the host site's).
4. Tap Save.
   - **Expect** "One collection was created…" and the **collection dashboard** opens.
   - **Expect** status **Open**, method "Dropped off by sites", 0/3 sites listed.
   - **Expect** the site users (C, D) get "Food collection scheduled…".
5. Validation checks (optional):
   - Set "list by" after the drop-off deadline → **Expect** an error.
   - Set pickup start before drop-off end → **Expect** an error.
   - Untick every site → saving uses all accepted sites.
6. **Invitation edge case**: create another group that has a still-pending site, then schedule it.
   - **Expect** the pending site is listed as "Waiting to accept" and is not selectable.
   - When it accepts, **Expect** it is added to that group's open/upcoming collections automatically.

---

## Part 5 — Site lists food into the collection (Canva SM1 → SM3)

1. Log in as **D** (Site 1 staff) → Listings → **List Surplus** → **Surplus Food for People**.
2. **SM1 — choose method**:
   - **Expect** the title "Choose collection method".
   - **Expect** the options **Direct charity collection** OR **Stadium North Consolidated Collection**.
   - **Expect** the drop-off text: "Please drop off your food at Loading Dock B by 11:00 am." and "List by 10:30 am".
   - Pick the consolidated option.
3. **SM2 — food details**:
   - Same food screen as normal. Add Bread 1 kg and Baked goods 0.5 kg.
   - Optionally type a descriptive quantity ("3 trays").
   - **Expect** the step 2 card "CONSOLIDATED COLLECTION · DROPPED OFF BY SITES" with Loading Dock B, the drop-off instruction, the windows and the suitability text.
   - **Expect** there are no pickup address or pickup time fields; those come from the collection.
   - Set the best-before **after** the pickup end (otherwise the manager will be blocked at publish).
4. **SM3 — review & confirm**:
   - **Expect** a food summary, the collection point, the drop-off instruction and the suitability text.
   - **Expect** the **mandatory site declaration** (full text). Submitting without ticking it shows an error.
   - Tick it and submit.
   - **Expect** the confirmation "Added to the Loading Dock B consolidated collection" + instruction.
5. Repeat as **C** for Site 3 (e.g. Sandwiches 4 kg). Leave **Site 2 empty** on purpose.
6. **Multi-site user check** (if A or B has access to several sites):
   - **Expect** the chooser shows "· for Site X" when there are several sites.
   - **Expect** the food is recorded against that site.
7. **Edit / withdraw before publish**: as D → Listings → the consolidated listing card → Edit.
   - Change a quantity → **Expect** it updates on the manager dashboard.
   - (Optional) Withdraw, then list again.

---

## Part 6 — Handover (Canva SM4)

1. As **D** → Listings.
   - **Expect** the card reads "Consolidated · Loading Dock B" with status **Awaiting drop off**.
   - **Expect** no Edit-pickup/Cancel buttons meant for direct listings.
2. Tap **Confirm food dropped off**.
   - **Expect** the status becomes **Dropped off / awaiting verification**, timestamped by the server.
   - **Expect** B and E get "Site 1 dropped off …".
   - Handover is allowed from 2 h before the drop-off window opens.
3. Repeat for Site 3.
4. Variant: re-run Parts 4–6 later with method **Collected from sites**.
   - **Expect** the wording "Your food will be collected from your outlet. Please have it ready by …".
   - **Expect** the button **Confirm food collected** and the statuses "Awaiting collection → Collected / in transit".

---

## Part 7 — Monitor + receipt at the shared point (Canva CM3)

1. As **B** → Home card → the collection.
   - **Expect** tiles: Sites listed 2/3, Handed over 2, Received 0, kg listed/verified.
   - **Expect** **Exceptions and reminders** listing "Not listed yet: Site 2" and a **Send reminder** button.
2. Tap **Send reminder** → **Expect** the Site 2 users get a push.
3. Wait for the "list by" time (or use ⋯ → **Close submissions now**).
   - **Expect** the status becomes **Submissions closed** and Site 2 shows as "No contribution".
4. **Late listing** (optional): as a Site 2 user, list food now.
   - **Expect** the chooser says "Listing has closed — your food will need manager approval".
   - **Expect** B sees "Site 2 listed after the deadline" with Approve / Reject.
5. **Receipt**: log in as **E** (receiver) → Home → Consolidated Collections → open the collection.
   - **Expect** E can record receipt but has no publish/cancel menu.
   - Site 1 → **Received** → **Expect** "Received at central point".
   - Site 3 → **Adjust quantity**, lower it (e.g. 4 → 3.5 kg) → **Expect** verified 3.5 kg.
   - Variant: **Not received** on a site → **Expect** that site's food is excluded and its users are told.
   - **Expect** each site gets "Your food was received at Loading Dock B (x kg verified)".
6. **Site privacy**: as **D**, open your contribution (Listings → card).
   - **Expect** you see only Site 1's food and status — never Site 3's.

---

## Part 8 — Publish one listing (Canva CM4)

1. As **B** on the dashboard → **Review food & publish**.
   - If disabled, the red lines say exactly why (e.g. "Confirm what arrived from Site 3, or exclude it", or a best-before earlier than pickup end). Fix those, then continue.
2. On the review screen:
   - **Expect** the consolidated items, Loading Dock B + address, the pickup window and the suitability text.
   - **Expect** a per-site breakdown (manager only).
   - **Expect** the warnings (e.g. "Sandwiches was reduced from 4 kg to 3.5 kg", "Site 2 did not contribute").
3. Tick the **manager declaration** → **Publish**.
   - **Expect** the status **Published · Waiting for a charity**.
   - **Expect** the sites get "Collection published to charities".

---

## Part 9 — Charity sees one listing, claims (Canva CH1, CH2)

1. Log in as **F** (charity) → Available.
   - **Expect** **one** listing at Loading Dock B with the total verified kg, pickup window, storage and allergens.
   - **Expect** the words "consolidated", "cluster" and "group" **do not** appear anywhere.
   - **Expect** no outlet names (Site 1, Site 3) appear anywhere.
2. Open it → Claim.
   - **Expect** **Full claim** only (no partial option).
   - Confirm.
3. As **B**:
   - **Expect** the dashboard shows **Claimed** with the charity name and pickup time.
   - **Expect** managers, receivers and sites get "A charity will collect…".

---

## Part 10 — Changes after publish/claim (rule R6/R11, optional)

1. As **D**, edit the published contribution (reduce bread by more than 20%).
   - **Expect** "sent for approval"; B sees "Site 1 requested a change" with Approve / Reject.
2. B approves.
   - **Expect** because the collection is claimed, F gets "Your pickup has changed — please review" and must acknowledge it on the pickup screen.

---

## Part 11 — Pickup: inspect & accept (Canva CH3)

1. As **F** → Available → **View Your Pickups** (or Updates / Pickups).
   - **Expect** the pickup shows **Collect**.
   - **Expect** the old "Yes, I collected it" single-tap confirmation is **not** used for this pickup.
2. Tap Collect → **Confirm collection** screen. For each item, set **accepted / rejected / unavailable**:
   - e.g. Bread: 1 accepted
   - Baked goods: 0.5 rejected → choose a reason (e.g. Packaging damaged)
   - Sandwiches: 3 accepted, 0.5 unavailable

   Then:
   - **Expect** rejecting without a reason, or "Other" without a note, to be blocked.
   - **Expect** each item's numbers must add up to its listed quantity.
3. Tick the **charity declaration** → **Confirm pickup** → rate.
   - **Expect** the rating/feedback flow continues as before.
4. **Driver variant** (optional): F requests a driver, G completes the pickup in the driver app.
   - **Expect** the dashboard shows **Awaiting item check** until F completes the item check in the app.

---

## Part 12 — Completion + reporting (Canva RP1)

1. As **B** → dashboard.
   - **Expect** **Completed**.
   - **Expect** Accepted 4 kg · Not accepted 0.5 kg · Not available 0.5 kg.
2. Each site gets "x kg of your food was collected".
3. As **F** → history/pickups.
   - **Expect** exactly **one** pickup for this collection (not one per site) and no site names.
4. As **D** → Insights.
   - **Expect** Site 1's impact includes **only Site 1's accepted** kg (1 kg).
5. As **B** → Insights → **Consolidated Collections report**.
   - **Expect** the combined totals: listed / verified / accepted / not accepted / not available.
   - **Expect** the per-site rows (Site 1, Site 3).
   - **Expect** "Accepted, by food category".
   - **Expect** "Not accepted, by reason".
   - **Expect** the collection row.
6. **No double counting**:
   - Total accepted in the report = Site 1 + Site 3 accepted = the charity's received kg in its impact.
   - The business's overall "Food saved" rises by the accepted kg **once**.

---

## Part 13 — Other manager actions

Run each on a fresh collection.

1. **Recurring**: schedule **Selected weekdays** (e.g. Mon + Fri) for 2 weeks.
   - **Expect** one collection per date in Upcoming (generated 14 days ahead).
2. **Edit series** (⋯ → Edit series), change the pickup time.
   - **Expect** future upcoming/open collections change; past and detached ones do not.
3. **Edit this collection** only.
   - **Expect** only that date changes.
4. **Reopen submissions** after closing.
   - **Expect** the sites can list again until the chosen time (not later than the drop-off deadline).
5. **Exclude** a received contribution (with a reason) before publishing.
   - **Expect** it is not in the published items.
6. **Cancel collection** (with a reason).
   - **Expect** the sites (and the charity, if claimed) are notified.
   - **Expect** the contributions show "Cancelled" and are **not** turned into direct listings.
7. **View audit** (⋯).
   - **Expect** every step listed with who and when.
8. **Archive group**.
   - **Expect** it is blocked while a collection is in progress, and allowed afterwards.

---

## Part 14 — Regression (must be unchanged)

1. A **direct** listing (List Surplus → Direct charity collection) still works end to end:
   - charity sees it with the normal claim (partial allowed)
   - "Yes, I collected it" works
   - impact counts once
2. **Not fit for human consumption** (animal) listings are unchanged.
3. **Connections / Preferred charity** listings are unchanged; the chooser still lists them.
4. Users with no consolidated access see **no** new rows, cards or screens.
5. The existing Insights totals are unchanged for businesses that never used Consolidated Collections.

---

## Quick troubleshooting

| Symptom | Likely cause |
|---|---|
| Nothing consolidated appears anywhere | `CONSOLIDATED_ENABLED` not set → endpoints return 404 → app hides the feature |
| B has no "Consolidated Collection Groups" row | A has not switched B on in Manage Access (Part 2) |
| Site doesn't see the collection in List Surplus | Site hasn't **accepted** its invitation, the collection isn't Open yet (wait for the sweep), or the pickup start has passed |
| "No site has accepted this group yet" when scheduling | All sites are still invited — accept at least one (Part 3) |
| Publish button disabled | Read the red reasons under it: close submissions, record every receipt, fix best-before |
| "It is too early to confirm handover" | More than 2 h before the drop-off/collection window opens |
| Charity can't see the listing | Charity outside the pickup radius, the pickup window ended, or best-before has passed |
