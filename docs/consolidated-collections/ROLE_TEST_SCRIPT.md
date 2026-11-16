# Consolidated Collections — role-by-role test script (production)

Plain-language script: who logs in, what they tap, what they should see.
Follow the steps in order; each step says which phone/user to use.

---

## ⚠️ Safety rules for testing on production

1. **Use a test business and a test charity only.** Never test with a real customer's account.
2. **Choose the collection point carefully.** When you publish (Step 13), every real charity near
   the collection point gets a "new food nearby" push and could claim it. So:
   - put the collection point somewhere no real charity is nearby (but within your test charity's pickup radius);
   - claim it with your test charity straight away;
   - or cancel the collection right after the test.
3. **Never publish an over-the-air update (`eas update`) from this code** until you have finished testing.
4. **Deploy order:**
   1. deploy the backend;
   2. run `npx prisma migrate deploy`;
   3. restart.

   The feature is now on by default — no environment variable is needed.

---

## The roles (create these once)

| Role in the test | What it is in the app | Who it is |
|---|---|---|
| **OWNER** | Owner of the test business (multi-site) | You |
| **MANAGER** | Team member with **Org Admin** role | A 2nd account |
| **SITE-3 ADMIN** | Team member, **Site Admin** of Site 3 only | A 3rd account |
| **SITE-1 STAFF** | Team member, **Staff** at Site 1 | A 4th account |
| **RECEIVER** | Team member, ordinary member (does the dock check) | A 5th account |
| **CHARITY** | A test charity account | A 6th account |

The test business needs **3 sites**: Site 1 and Site 2 with **no** Site Admin, and Site 3 with the SITE-3 ADMIN.

How to set them up (OWNER, in the existing app):

1. Account / Home → **Manage Sites** → add Site 1, Site 2, Site 3 (if they don't exist yet).
2. Account → **Manage Access** → invite each team member with the role shown above, and accept the invite
   emails on each account.
3. Register the CHARITY as a charity organisation near where you'll put the collection point.

Tip: one device per role is easiest. With fewer devices, log out and in, following the step headings.

---

## Step-by-step, in time order

### STEP 1 — OWNER: allow the manager
1. Account → **Manage Access**.
2. Find **Consolidated Collections managers** → switch **MANAGER** on.
3. ✅ You'll see:
   - the switch stays on;
   - ordinary members can't be switched on (greyed out).

### STEP 2 — MANAGER: create the collection group (one-time setup)
1. Account → **Consolidated Collection Groups** (just under Manage Access).
2. **Create group**:
   - Name: `Stadium North`
   - Collection point: name `Loading Dock B`, pick the address (see safety rule 2), directions `Rear gate`
   - Sites: tick Site 1, Site 2, Site 3; Host site: Site 1
   - Managers: you; Receivers: RECEIVER
3. Save.
4. ✅ You'll see:
   - the message "1 site has been invited and will take part once they accept";
   - the list shows `2 sites taking part · 1 invited`.

### STEP 3 — SITE-3 ADMIN: answer the invitation
1. Open the app.
2. ✅ You'll see:
   - a push "Shared collection invitation";
   - a green card on Home: "You have a collection invitation".
3. Tap it.
4. ✅ You'll see the group name, Loading Dock B, the manager's name and Accept / Decline.
5. Tap **Decline**, type a reason, then Decline.
6. ✅ The MANAGER gets "Site declined your invitation" with the reason.
7. **MANAGER**: open the group → tick Site 3 again ("Declined — select to invite again") → Save.
8. **SITE-3 ADMIN**: open the new invitation → **Accept**.
9. ✅ You'll see:
   - the card disappears;
   - the MANAGER gets "Site joined your collection group";
   - the group shows 3 sites taking part.

### STEP 4 — MANAGER: schedule today's collection
1. Home → **Consolidated Collections** card → **Schedule collection**.
2. Fill in:
   - Group: Stadium North
   - How food reaches the point: **Dropped off by sites**
   - When: **One-off**, today
   - Times — pick them relative to "now" so you can walk through it, e.g. if it's 10:00:

     | Field | Time |
     |---|---|
     | Sites must list food by | 10:30 |
     | Drop-off window opens | 10:00 |
     | Final drop-off deadline | 11:00 |
     | Charity pickup window | 11:15 → 18:00 |

   - Contact name/phone, and suitability: `Sealed, labelled, chilled`
3. Save.
4. ✅ You'll see:
   - the collection dashboard opens with status **Open**, "Dropped off by sites" and 0/3 sites listed;
   - SITE-1 STAFF and SITE-3 ADMIN get "Food collection scheduled…".

### STEP 5 — SITE-1 STAFF: add food to the collection
1. Listings → **List Surplus** → **Surplus Food for People**.
2. ✅ The popup is titled **Choose collection method**, with two choices:
   - **Direct charity collection** (the normal flow);
   - **Stadium North Consolidated Collection**, showing "Please drop off your food at Loading Dock B by 11:00 am".
3. Tap the Stadium North option.
4. Food: Bread 1 kg, Baked goods 0.5 kg → Continue.
5. ✅ Step 2 shows a green **Consolidated Collection** card (point, drop-off instruction, times,
   suitability). There are no pickup address or time fields to fill in.
6. Set **best-before later than 18:00 today** → choose storage → Continue.
7. Review screen → tick the **declaration** → submit.
8. ✅ You'll see "Added to the Loading Dock B consolidated collection" + the drop-off instruction.

### STEP 6 — SITE-3 ADMIN: add food too
- Same as Step 5, e.g. Sandwiches 4 kg.
- **Leave Site 2 empty** on purpose (to test "no contribution").

### STEP 7 — SITE-1 STAFF: confirm drop-off
1. Listings → find the card "Consolidated · Loading Dock B", status **Awaiting drop off**.
2. Tap **Confirm food dropped off**.
3. ✅ You'll see:
   - the status becomes **Dropped off / awaiting verification**;
   - the MANAGER and RECEIVER get "Site 1 dropped off…".

### STEP 8 — SITE-3 ADMIN: confirm drop-off
- Same as Step 7.

### STEP 9 — MANAGER: monitor
1. Open the dashboard.
2. ✅ You'll see:
   - Sites listed 2/3, Handed over 2;
   - **Exceptions and reminders** shows "Not listed yet: Site 2".
3. Tap **Send reminder**.
4. ✅ Site 2's users get a push.

### STEP 10 — MANAGER: close submissions
1. Wait for the "list by" time, or tap ⋯ → **Close submissions now**.
2. ✅ You'll see:
   - status **Submissions closed**;
   - Site 2 shows as **No contribution**.

### STEP 11 — RECEIVER: check what physically arrived
1. Home → **Consolidated Collections** → open today's collection.
2. Site 1 → **Received**.
3. ✅ It shows "Received at central point".
4. Site 3 → **Adjust quantity** → change 4 → 3.5 kg.
5. ✅ Verified shows 3.5 kg.
6. ✅ Both sites get "Your food was received at Loading Dock B".
7. ✅ The receiver has **no** publish / cancel menu.

### STEP 12 — SITE-1 STAFF: privacy check
1. Listings → tap your consolidated card.
2. ✅ You see only Site 1's food and status — never Site 3's.

### STEP 13 — MANAGER: publish to charities
1. Dashboard → **Review food & publish**.
   - If it's greyed out, the red lines below it say why (e.g. a receipt is missing, or a best-before is too early). Fix that first.
2. ✅ The review shows:
   - the items and Loading Dock B with the pickup window;
   - a per-site breakdown;
   - warnings ("Sandwiches reduced from 4 kg to 3.5 kg", "Site 2 did not contribute").
3. Tick the **manager declaration** → **Publish**.
4. ✅ You'll see:
   - status **Published · Waiting for a charity**;
   - the sites get "Collection published".

### STEP 14 — CHARITY: find and claim it
1. **Available**.
2. ✅ You see **one** listing at Loading Dock B (4.5 kg), with pickup window, storage and allergens.
3. ✅ The words "consolidated / cluster / group" and the site names appear **nowhere**.
4. Open it → Claim.
5. ✅ Only **Full claim** is possible.
6. Confirm.
7. ✅ The MANAGER's dashboard shows **Claimed** + the charity name.

### STEP 15 — CHARITY: pick up and inspect
1. **View Your Pickups** → tap **Collect** on this pickup.
2. ✅ A **Confirm collection** screen opens (not the old "Yes, I collected it" popup).
3. For each item enter accepted / rejected / unavailable:
   - Bread → 1 accepted
   - Baked goods → 0.5 rejected, reason "Packaging damaged"
   - Sandwiches → 3 accepted, 0.5 unavailable
4. ✅ Rejecting without a reason is blocked.
5. ✅ Each item's numbers must add up to its quantity.
6. Tick the **declaration** → **Confirm pickup** → give a rating.

### STEP 16 — Everyone: check the results
1. **MANAGER** — dashboard:
   - ✅ **Completed**: Accepted 4 kg · Not accepted 0.5 · Not available 0.5.
2. **MANAGER** — Insights → **Consolidated Collections report**:
   - ✅ combined totals;
   - ✅ Site 1 and Site 3 rows;
   - ✅ by food category;
   - ✅ by rejection reason.
3. **SITE-1 STAFF** — Insights:
   - ✅ only Site 1's accepted 1 kg is added.
4. **CHARITY** — pickup history:
   - ✅ **one** pickup, no site names;
   - ✅ the charity impact grows by 4 kg (the accepted total), not more.

### STEP 17 — MANAGER: extra actions (use a new collection each time)
1. **Recurring**: schedule "Selected weekdays" for 2 weeks.
   - ✅ Several dates appear under Upcoming.
2. ⋯ → **Edit series** / **Edit this collection**.
   - ✅ Future dates change; past ones don't.
3. ⋯ → **Reopen submissions**.
   - ✅ Sites can list again.
4. **Late food**: close submissions, then a site lists food.
   - ✅ The site sees "needs manager approval".
   - ✅ The manager can Approve / Reject.
5. ⋯ → **Cancel collection** with a reason.
   - ✅ The sites (and the charity, if claimed) are notified.
6. ⋯ → **View audit**.
   - ✅ Every action is listed with who and when.
7. Try the method **Collected from sites**.
   - ✅ The wording becomes "Have your food ready for collection by…" and the button "Confirm food collected".

### STEP 18 — Make sure nothing old broke
1. **SITE-1 STAFF**: List Surplus → **Direct charity collection**.
   - ✅ The normal listing works as before, including partial claim and "Yes, I collected it".
2. Animal / "not fit for human consumption" listing.
   - ✅ Unchanged.
3. A business user who isn't part of any group.
   - ✅ Sees no new cards on Home.

---

## If something doesn't show up

| Problem | Fix |
|---|---|
| Nothing consolidated anywhere | Backend not redeployed with the new code, or migration not run |
| MANAGER has no "Consolidated Collection Groups" | OWNER hasn't switched them on (Step 1) |
| A site doesn't see the collection in List Surplus | Site hasn't accepted the invitation, the collection isn't Open yet (wait up to 5 min), or pickup has already started |
| "No site has accepted this group yet" | Accept at least one invitation first |
| Publish greyed out | Read the red lines under the button |
| "Too early to confirm handover" | More than 2 h before the drop-off window opens |
| Charity can't see the listing | Charity outside pickup radius, pickup window over, or best-before passed |
