# Consolidated Collections — hands-on walkthrough (with the CC QA accounts)

For trying every screen yourself and showing it to the client. Each step says **which
account**, **the exact path in the app**, and **what you should see**. Do the steps in order.

| Login (password: ask Swagat — not stored in the repo) | Person | Plays the part of |
|---|---|---|
| `swagatdash164+ccowner@gmail.com` | **Olivia Grant** — owner of *Stadium North Venue* | Business owner, collection manager and receiver at the dock |
| `swagatdash164+ccsiteadmin@gmail.com` | **Sam Patel** — Site Admin of *Kiosk 2 - Members Bar* (staff at Kiosk 1) | Runs one outlet; receives the invitation |
| `swagatdash164+ccstaff@gmail.com` | **Tom Reyes** — staff at *Kiosk 3 - Gate 4 Cafe* | Lists food and confirms drop-off for Kiosk 3 |
| `swagatdash164+cccharity@gmail.com` | **Priya Nair** — *Thankful Kitchen* (charity, 2 Olympic Blvd, 10 km pickup range) | Claims and collects |

The venue's three kiosks are at 1, 3 and 5 Olympic Blvd, Melbourne, on a trial plan. Use a
collection point address on Olympic Blvd (e.g. *Loading Dock B, 1 Olympic Blvd*) so the
charity is in range. Below, "Owner" = Olivia, "Site Admin" = Sam, "Staff" = Tom, "Charity" = Priya.
When the owner creates the group with all three kiosks, Kiosks 1 and 3 join straight away and
**Kiosk 2 is invited** (Sam runs it).

**Before you start**

- The phone needs the newest app build (the one with these screens).
- The owner's business needs 3 sites. The Site Admin must be **Site Admin of one site only**.
- The charity must be located within pickup range of the collection-point address you'll use.
- Real charities near that address get a "new food nearby" alert when you publish. Pick a
  quiet address, claim it straight away with CC QA Charity, or cancel it afterwards.
- The system checks deadlines every 5 minutes. If a status hasn't changed, wait and pull down to refresh.

---

## 1. Give someone permission to run collections (Owner)

**Account → Manage Access** → scroll to **Consolidated Collections managers** (above Team Members).

- The owner is always on.
- Switch on anyone else who should run collections.
- Only Org Admins and Site Admins can be switched on.

**Show the client:** only approved people see the setup screens.

## 2. Create the collection group (Owner) — Canva CM1

**Account → Consolidated Collection Groups → Create group**

1. **Group details:** name `Stadium North`.
2. **Shared collection point:** name `Loading Dock B`, search the address, directions `Rear gate`.
3. **Participating sites:** tick all 3 sites. Host site: Site 1.
4. **People:** Managers = you, Receivers = you (or another team member).
5. **Create group**.

You should see:

- A message that **1 site has been invited** (the Site Admin's site).
- On the groups list: `2 sites taking part · 1 invited`.
- Opening the group shows each site's status: *Taking part* / *Invited — waiting to accept*.

## 3. Accept the invitation (Site Admin) — Canva CM1 "invitation and accept"

**Home** → green card **"You have a collection invitation"** → **Collection invitations**

1. Try **Decline** with a reason → the owner gets a notification with the reason.
   In the group form, that site shows *Declined — select to invite again*.
2. **Owner:** Account → Consolidated Collection Groups → Stadium North → tick the site again → **Save changes**.
3. **Site Admin:** open the invitation again → **Accept**.

You should see the card disappear and the owner notified. The group now shows 3 sites taking part.

## 4. Schedule today's collection (Owner) — Canva CM2

**Home → Consolidated Collections card → Schedule collection**
(The Home card appears once you're part of a group.)

1. **Collection group** and **Collection point**.
2. **How will food reach the collection point?** Choose **Dropped off by sites**.
   The green box shows exactly what sites will be told.
3. **One-off or recurring:** One-off, today. *Sites can start listing: On the day.*
4. **Times:** tap each time tile to set it. Use times starting a few minutes from now, e.g.
   list by +30 min, drop-off +0 → +60 min, charity pickup +75 min → this evening.
5. **Participating sites:** all three.
6. **Suitability & contact:** e.g. `Sealed, labelled, chilled`, plus contact name and phone.
7. **Save consolidated collection**.

You should land on the **collection dashboard**: status *Open*, *Sites listed 0 of 3*, and a
green **Sites are listing food** card.

## 5. Sites list food (Sam for Kiosk 2, then Tom for Kiosk 3) — Canva SM1–SM3

**Listings tab → Surplus Food for People → LIST SURPLUS** (or **Home → List Surplus**)

1. Popup **Choose collection method**: *Direct charity collection* **OR** *Stadium North
   Consolidated Collection*, with "Please drop off your food at Loading Dock B by …".
2. Choose the consolidated option.
3. **Food details:** add items with weights. You can also type "3 trays" under an item.
4. **Collection logistics:** a green card with the collection point, instruction, times and
   suitability. There are **no** pickup fields to fill. Set the best-before **after** the pickup ends.
5. **Confirm listing:** tick the **Food safety declaration** → submit.
6. Confirmation: "Added to the Loading Dock B consolidated collection".

Repeat as **Tom (Staff)** for Kiosk 3. Leave Kiosk 1 empty on purpose to see
*Exceptions and reminders* (or list for it as Olivia, picking the line that says *for Kiosk 1*).

## 6. Confirm the drop-off (each site) — Canva SM4

**Listings tab → Your listings** → the card that says *Consolidated · Loading Dock B*

- Tap **Confirm food dropped off** → status becomes *Dropped off / awaiting verification*.
- Tap the card's header to open the site's own page: progress track, your food, collection
  details, **Edit** and **Withdraw**.

**Show the client:** a site only ever sees its own food, never the other outlets'.

## 7. Monitor and check what arrived (Owner) — Canva CM3

**Home → Consolidated Collections → Today → tap the collection**

- **Overview:** status, method, *Sites listed* progress, figures for listed / verified / dropped off / received.
- **Exceptions and reminders:** the empty site is listed. Tap **Send reminder**.
- Top-right **⋯ → Close submissions now**, or wait for the listing deadline.
- **Participating sites** → on each site tap **Check what arrived** and choose:
  - **Received** (all as listed);
  - **Adjust quantity** (less arrived — use − / +);
  - **Not received** (nothing arrived).

Optional: list food from the empty site after closing. The dashboard then shows
*listed after the deadline* with **Approve / Reject**.

## 8. Publish one listing (Owner) — Canva CM4

**Dashboard → green card → Review food & publish**

- If the button is grey, the red lines above it say exactly what to fix.
- **Charity preview:** the one listing charities will see (no site names).
- **Where it came from:** the per-site breakdown, for your records only.
- Tick the **Manager declaration** → **Publish to charities**.

Dashboard status becomes *Published — waiting for a charity*.

## 9. The charity claims (Charity) — Canva CH1–CH2

**Available tab** → the Loading Dock B listing → **Claim**

- One normal listing. No "consolidated", "cluster", "group" or outlet names anywhere.
- Only **Full claim** is offered.

Back on the Owner's dashboard: *Thankful Kitchen will collect* (your charity's name), with the pickup window.

## 10. Pick up and inspect (Charity) — Canva CH3

**Available tab → View Your Pickups → Collect** (also reachable from the Updates tab)

1. The **Confirm collection** screen opens (not the old "Yes, I collected it" popup).
2. For each item, split the weight into **Accepted / Not accepted / Not available**.
   - The green tag confirms when it adds up.
   - If anything is *Not accepted*, choose a reason.
3. Tick the **Charity declaration** → **Confirm pickup** → rate the pickup.

## 11. Results and reporting (everyone) — Canva RP1

| Who | Where | What you should see |
|---|---|---|
| **Owner** | Dashboard | *Completed* with Accepted / Not accepted / Not available kg → **View report** |
| **Owner** | **Insights tab → Consolidated Collections report** | Accepted kg and share of verified; by site, by food category, reasons; past collections |
| **Site Admin** | Insights tab | Only their own site's accepted kg is added |
| **Charity** | Pickups / history | **One** pickup, no site names |

## 12. Extra things worth showing

All from the dashboard's **⋯** menu, or when scheduling:

- **Edit this collection** or **Edit the whole series**.
- **Reopen submissions**.
- **View audit trail** (who did what, when).
- **Cancel collection** (sites and charity are told; food is never turned into normal listings).
- Schedule a **recurring** collection (e.g. Fri + Sat): several dates appear under *Upcoming*.
- Schedule with **Collected from sites**: sites see "Your food will be collected from your
  outlet. Please have it ready by …" and the button **Confirm food collected**.

---

## If something doesn't show

| You don't see… | Why |
|---|---|
| *Consolidated Collection Groups* in Account | That user isn't switched on in Manage Access (step 1) |
| The *Consolidated Collections* card on Home | The user isn't a manager or receiver of any group yet |
| The consolidated option when listing surplus | The site hasn't accepted the invitation, the collection isn't open yet (wait ≤5 min), or pickup has already started |
| "No site has accepted this group yet" when scheduling | Accept at least one invitation first |
| The charity can't see the listing | Charity out of range, pickup window over, or best-before already passed |
