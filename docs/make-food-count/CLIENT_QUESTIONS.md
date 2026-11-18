# Make Food Count — questions for Saveful

We compared the written specification (31 Oct) with the prototype deck (26 Oct). The build is already under way;
for each question we've written what we'll do unless you tell us otherwise. Questions 1–6 affect what we build this
week, so a reply by **Tuesday 17 November** keeps the 20 November date safe.

## Needed by Tuesday

1. **Fit for humans tick.** The specification has a "Fit for humans" tick on each Overproduction line, but the
   prototype doesn't show one, and offers all Overproduction for the people listing.
   *We'll show the tick, already ticked, so it works like the prototype unless a cook unticks something.* OK?

2. **Choosing a destination.** The prototype's phone steps include "Choose destination", and the "not fit for human
   consumption" listing has "Intended reuse: Animal feed / Bioenergy / Compost" buttons. The specification says the
   business should **not** choose a destination.
   *We'll leave both out. Receivers claim as they do today.* OK?

3. **Who collects food that isn't fit for people?** Today, Saveful Connect only has charities (food for people) and
   farmers (animal feed) as receivers. The Insights design also shows **compost** and **bioenergy**.
   - Will composters and bioenergy providers join Saveful Connect as receivers?
   - If yes, is there a list we should onboard?
   *Until then, not-fit food can only be claimed by farmers, and the compost and bioenergy figures will show 0.*

4. **Animal feed rules.** In Australia it is illegal to feed pigs food scraps that contain or have touched meat
   ("swill feeding"). Plate scraps, meat offcuts, bones and meat spoilage could fall into this.
   - Should any of these be **kept out** of the not-fit listing?
   - Or should they be flagged so that only approved receivers can claim them?
   *We'd like your guidance here rather than guess.*

5. **"Wasted / landfill" figure.** The prototype's Insights show a "Wasted / landfill" total. The specification asks
   us not to say food was disposed of without evidence.
   *We'll show **Not recovered**, broken down as not listed / not claimed / expired / cancelled / not collected.* OK?

6. **Food lists.** Please confirm the final rows and their labels.
   - Overproduction: Prepared meals, Fruit & vegetables, Meat & poultry (Chicken, Beef, Lamb, Pork, Other), Bakery,
     Dairy, Seafood (Fish, Shellfish, Other), Pantry items, Other.
   - Spoilage: same as Overproduction, without the meat and seafood sub-types.
   - Preparation: Peels & trimmings, Meat offcuts, Bones, Shells, Coffee grounds, Bread & baked goods,
     Preparation mistake, Other. *The specification lists Bread & baked goods; the prototype doesn't.*
   - Plate Scraps: Mixed plate scraps.
   - On the people listing, should "Bakery" appear as **Baked goods**, or be split into **Bread** and **Baked goods**?

## Needed before release

7. **Icon images.** Please share the images in the Google Drive folder, or give us download access, together with
   confirmation that we can use them in the app.

8. **Computer version.** The prototype's large screens look like a web page, with Home, Listings & activity and
   Impact along the top. Is a **tablet running the app** enough for kitchens? Or do you also want Make Food Count in
   the web (Enterprise) portal?

9. **Shared kitchen tablets.** Will several staff use one tablet under one login? *We record whoever is logged in.*

10. **Cluster filter.** The specification lists a Cluster filter; the prototype doesn't show one.
    *We'll show it only for organisations that use clusters.* OK?

11. **Limits.** Kilograms to 2 decimal places, and at most **500 kg per line**? Does any kitchen weigh in grams?

12. **How often.** Is it one record per site per day ("Today's Waste")? Or can a kitchen save several records a
    day, or record for an earlier date?

13. **Dates in reports.** If food is recorded on Monday and collected on Wednesday, it counts in Monday's figures.
    Is that right?

14. **Edits after listing.** Can a saved record still be changed after its listing is published? *We'll allow it,
    except that a line can't go below what is already listed or collected.*

15. **Impact numbers.** We'll use Saveful Connect's existing meals and CO₂ factors, labelled "estimated". OK?

16. **Home tiles.** Do "Food diverted", "Collections" and "CO₂ avoided" on Home cover **all** of the site's Saveful
    collections, or only food that came through Make Food Count?

17. **Compass demo.** Production reports will never show demo figures. Do you need a separate **demo account**
    with the eight Compass demonstration sites for presentations?
