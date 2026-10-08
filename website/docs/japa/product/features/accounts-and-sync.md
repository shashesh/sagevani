---
status: draft
updated: 2026-10-06
phases: P1, P2
---

# Accounts and sync

The app works fully without an account. An account is for **backup and sync across devices**, nothing else ([decision](../../decisions/2026-09-22-guest-first-accounts.md)). Data shapes and sync rules: [data-model](../../architecture/data-model.md#storage-and-sync).

> Sync is our own code against Supabase, and sign-in is decided in part 3 ([Q-11](../../../../../docs/governance/open-questions.md)). This spec keeps the product behaviour. Where it names a mechanism, part 3 confirms it.

## Guest first (P1)

- On the first visit, `/japa` creates a **local profile**. Everything the devotee does belongs to it and stays in the browser; nothing is uploaded without an account and consent.
- Everything works as a guest: every chanting mode, the library, favourites, sankalpas, charts. Reminders need web push from a server; whether guests get them, and what the server may know, is decided in part 3 ([Q-12](../../../../../docs/governance/open-questions.md)).

## Where sign-in appears (P1)

Never between opening the app and chanting ([vision](../vision.md#guiding-principles)).

- **Welcome screen:** a small "I already have an account" link, so a returning devotee restores their practice instead of starting over ([onboarding](onboarding.md)).
- **Backup offer:** on the session-end or Progress screen, after the 3rd day of practice or at 1,008 repetitions, whichever comes first. At most 3 offers in total. Browsers can clear stored data, so part 3 may make the first offer sooner. Each offer also mentions export as an alternative.
- **Settings → Account**, always.

## Sign-in methods (P1)

To be confirmed in part 3, which also chooses between Supabase Auth and Payload ([Q-11](../../../../../docs/governance/open-questions.md)).

- **Google**, through a redirect.
- **Apple**, through a redirect. On the web it is optional, not required. It stays for devotees who prefer it.
- **Email one-time code:** a 6-digit code, no password.
- **Email codes, not magic links:** a link may open in a different browser from the one that holds the devotee's practice.
- **Redirects, not popups,** in case the storage part 3 chooses needs cross-origin isolation headers, which cut popups off from the page that opened them.
- **Same person, several methods:** Google and Apple sign-ins that share a verified email belong to one account. Apple's "Hide my email" addresses won't match; **P2** adds "Link another sign-in method" in Settings.
- **Phone number (SMS code): later.** Every SMS costs money, and SMS pumping fraud is a real risk.

## Consent before the first sync (P1)

Knowing which deities and mantras someone chants reveals their religion: **special-category data** under GDPR Article 9, and personal data under India's DPDP Act.

- Consent comes **before any data is downloaded or uploaded**, including the account's own data on sign-in. A plain-language screen explains what is stored (practices, counts, sankalpas, favourites; private guru mantras only as their label), where, and why, and asks for **explicit agreement**.
- The policy version and date agreed are recorded in `consents`.
- **"Not now"** keeps the devotee as a guest. Nothing is uploaded.

## Age (P1, needs legal review)

India's DPDP Act treats anyone under 18 as a child and requires verifiable parental consent. Proposed for P1: accounts are for **18+ in India and 16+ elsewhere**, confirmed by the user when signing up. Younger devotees use guest mode, which stays on the device. [Kids mode](age-modes-and-accessibility.md#kids-mode) (P3) revisits this. A lawyer must confirm before launch.

## Signing in on a device that already has data

Nothing is asked, and **no count is ever lost**: counts are append-only events, so combining them is always safe. Settings and preferences are different: where the device and the account disagree, one value has to win, as the table shows.

| Data                   | Rule                                                                                                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Count events, sessions | Combined. Ids are unique, so nothing is counted twice. Chanting done on two devices adds up, because it really was chanted twice                                                                |
| Saved practices        | Matched by practice. A practice is a favourite if it's starred on either side; other settings: the latest edit wins ([conflict rule](../../architecture/data-model.md#conflict-rule))           |
| Deity defaults         | The account's value wins                                                                                                                                                                        |
| Profile                | The account's value wins                                                                                                                                                                        |
| Sankalpas              | Both kept. The devotee can release one                                                                                                                                                          |
| Custom practices       | Both kept                                                                                                                                                                                       |
| Namavali position      | Merged by the [position rule](../../architecture/data-model.md#practiceposition): content version first, then pass number, with marks inside the same pass combined. Not plain latest-edit-wins |

**Order of steps**, so per-user uniqueness (one saved practice per practice, one default per deity, one position per practice) always holds:

1. **Seal the open count event**, so nothing is left that can't sync and no count stays behind under the local profile.
2. **Consent**, before anything is downloaded or uploaded. If the devotee says "Not now", the app stops here and they stay a guest: nothing leaves or reaches the device. If the account already recorded agreement to the current policy version, the app doesn't ask again; that check reads only the consent record.
3. **Download** the account's data completely. The device's rows keep the local owner id meanwhile. If the download fails, nothing changes and the app retries later.
4. **Combine** on the device, using the table above. Where both sides have a row for the same practice or deity, one row survives: the account's row, updated with the combined values.
5. **Re-key** the device's remaining rows to the account's id, recomputing the [derived ids](../../architecture/data-model.md#ids-for-rows-that-are-unique-per-devotee) of the profile, saved practices, deity defaults and positions.
6. **Upload.** Count events and sessions are inserted by id, and an id the server already has is ignored, so a retry can't double-count; a session also allows the one-time filling in of `ended_at`. Rows where the latest edit wins go through the [conflict rule](../../architecture/data-model.md#conflict-rule), so a retry can never undo a newer edit.

Afterwards the devotee sees what happened, e.g. "Added 2,340 repetitions from this device to your account."

A devotee signing in on a new device or browser whose account has `onboarded_at` set skips onboarding and lands on their last practice.

## Signing out (P1)

- Signing out first **seals the open count event** and **waits for sync**.
- This covers **everything not yet synced**, not only counts: sessions, your place in a namavali, saved practices and their settings, deity defaults, custom practices and sankalpas.
- If any of it can't sync (for example, offline), the devotee chooses:
  - **Wait** and try again when online (the default);
  - **Export** everything pending to a file first, then sign out;
  - **Discard** it: the screen lists what would be lost ("12 counts from today, and 3 changes to your practices") and asks for confirmation.
- Only then does signing out **remove the account's data from the device** and return to the Welcome screen. This protects privacy on shared family phones and computers. Everything that synced is safe in the account.

## Deleting an account (P1)

- **Settings → Account → Delete account** in `/japa`.
- Deletes the account and all its server data, and signs out every device.
- **In the browser used to delete**, the devotee then chooses: **keep my practice on this device as a guest**, or **erase everything**.
- **Keeping it as a guest** creates a new local owner id and profile, moves the kept records to it (recomputing their [derived ids](../../architecture/data-model.md#ids-for-rows-that-are-unique-per-devotee)), and clears the sign-in details, the stored consent and everything the sync kept track of. The device is then exactly as it would be for someone who never signed in.
- **Every other device clears the account's data the next time it connects.** The app checks the account whenever it comes online, and a deleted account fails that check. The device then removes the account's data and says why: "This account was deleted, so its practice has been removed from this device." If that device has counts that never synced, the devotee can export them first; nothing else is kept.
- **A device that stays offline** keeps its copy until it next connects. The deletion screen says this plainly.

## Export and import (P1)

For everyone, including guests.

- **Settings → Backup → Export** saves a file with the profile, saved and custom practices, deity defaults, namavali positions, sessions, count events and sankalpas.
- **Import** combines using the same rules as signing in, so importing the same file twice changes nothing.
- **Import ignores who owned the file.** Every imported record is re-keyed to whoever is using the app now: the local owner id, or the signed-in account. Generated ids are kept as they are; ids [derived from the owner](../../architecture/data-model.md#ids-for-rows-that-are-unique-per-devotee) (profile, saved practices, deity defaults, positions) are recomputed for the new owner, and a recomputed id that matches an existing row is combined with it. A repeat import is harmless because kept ids are the file's own and recomputed ids come out the same every time, so both land on rows already imported. Nothing imported can ever be uploaded under someone else's account.
- **The profile is the exception.** There is only ever one profile per user, so the file's profile is never added as a second one. It is compared with the current profile by the row-level [conflict rule](../../architecture/data-model.md#conflict-rule): if the file's profile was edited later, its settings replace the current ones as a whole; otherwise it is ignored. Its id is recomputed for the current owner, which gives the current profile's id, so it can only ever update that one profile.
- If the file came from a **different account**, the app says so before importing, since those counts will join the devotee's own practice.
- The file contains private fields (intentions, private labels), and the export screen says so.

## Web

- Guest data lives in the browser's storage, which the browser can clear. `/japa` asks the browser to keep it and offers backup sooner.
- `/japa` opens offline after the first visit; the blog does not ([data-model](../../architecture/data-model.md#web)).

## Security and privacy

- Every synced record carries its owner's `user_id`. Row-level security on every user table: devotees can only read and write their own rows ([data-model](../../architecture/data-model.md#ownership-and-shared-fields)). Uploads and downloads both enforce this ([server](../../architecture/data-model.md#server-supabase)).
- Count events can be inserted, never updated or deleted, except by deleting the account.
- Private fields never appear in analytics or logs ([data-model](../../architecture/data-model.md#private-fields)).

## Later

- **P2:** link another sign-in method; phone sign-in if the cost and fraud controls allow it.
- **P3:** family and group features ([community](community.md)); kids mode and its consent rules.
