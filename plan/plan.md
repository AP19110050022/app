# HireMyFace — Admin Panel

A private control room for running HireMyFace: approve creators, keep the platform safe, follow deals and money, and see how the business is doing.
It has one main admin (the owner), who can add helper admins and remove them.

## Who it's for
- **Main admin (owner):** full control, including adding and removing helper admins.
- **Helper admins:** run daily moderation and support. They cannot add or remove admins, and they cannot block the main admin.
- **Regular users** (creators and businesses) never see the admin panel. They only see the new "Report" option.

## Core features and experience

**1. Dashboard (home of the admin panel)**
- Number cards: total users, creators (live / pending / rejected), businesses, Pro subscribers, open jobs, active deals, completed deals.
- Money: total paid by businesses, platform earnings (10% service fee plus Pro subscriptions), and paid out to creators.
- Each number can be shown for today, the last 7 days, the last 30 days or all time.
- "Needs attention" counters: creators waiting for approval, open reports, deals in dispute. Tapping one opens that list.

**2. Creator approvals**
- A queue of new and edited creator profiles showing photo, categories, plans and prices, posts and location.
- Approve or Reject. Rejecting needs a short reason, which the creator sees in a notification and on their profile.
- Only approved creators appear in Discover (already the rule, kept as is).

**3. Users**
- Search by name or email. Filter by role (creator / business / both), status (active / blocked) and Pro.
- Open any user to see their profile, jobs, deals, reports against them and payment history.
- Block or Unblock with a reason. A blocked user is signed out, can't log in, and their profile, jobs and posts disappear everywhere. Their ongoing deals are paused.

**4. Jobs and posts moderation**
- A list of all jobs posted by businesses, plus creator posts (photos and reels).
- Remove any job or post with a reason. The owner gets a notification.

**5. Deals and payouts**
- A list of all deals with business, creator, plan, amount, status and payment state.
- **Payouts are released automatically:** once the business marks the work as approved, the creator's payout (amount minus the 10% fee) is released at once, with no admin step.
- Admins can still see each payout and its status (pending, released, failed) and retry a failed one.
- Disputed deals pause automatic payout until an admin resolves them.

**6. Reports and disputes**
- Users get a "Report" button on creator profiles, business profiles, jobs and deal chats, with a reason (fake profile, inappropriate content, scam, no-show, other) and an optional note.
- On a paid deal, the business can "Raise a dispute" instead of approving the work.
- Admins see open reports and disputes. They can read the deal chat, then resolve with one of these actions:
  - dismiss
  - warn the user
  - remove the content
  - block the user
  - for disputes only: release the payout to the creator, or mark it refunded to the business
- Both sides are notified of the outcome.

**7. Admin team (main admin only)**
- Add a helper admin by email. That person must already have a HireMyFace account; if not, they become admin as soon as they sign up with that email.
- Remove a helper admin at any time.
- An activity log of who did what and when (approved, blocked, removed, resolved, released), visible to all admins.

## User flow
1. The main admin logs in and sees an "Admin" entry in the menu (hidden for everyone else).
2. They land on the Dashboard, check the "Needs attention" counters, and tap into a queue.
3. Creator approvals: review, then approve or reject with a reason.
4. Reports: open one, review the content and chat, then take an action. The users are notified.
5. Deals: follow payments. Payouts go out on their own when businesses approve the work; admins step in only on disputes or failed payouts.
6. Admin team: the main admin adds a helper by email. The helper then sees the Admin menu, without the Team section.

## UI/UX feel
- Same dark violet/blue social-app style as the rest of HireMyFace, but laid out for work: a side menu on desktop, tabs at the bottom on mobile.
- Clear coloured status pills (pending, approved, rejected, blocked, disputed, released).
- Every destructive action (block, remove, reject, refund) asks for confirmation and a reason.
- Works fully on phone.

## Implementation phases
- **Phase 1 — MVP (built now):** everything above, including the dashboard, creator approvals, users with block/unblock, jobs and posts removal, the deals list with automatic payout on business approval, reports and disputes, the admin team with main admin and helpers, and the activity log.
- **Phase 2:** charts of growth over time, exporting lists to a spreadsheet, broadcast announcements to all users, and verified-badge control.
- **Phase 3:** finer helper roles (for example "moderator only" or "payments only"), automatic flagging of suspicious profiles, and an email summary to admins each day.

## Assumptions
- No email was given, so the **main admin will be the first account that logs in after this update**. This can be changed to a specific email at any time.
- Helper admins can do everything except manage the admin team and block admins.
- Blocking hides all of the user's content and pauses their deals. Nothing is deleted, so unblocking restores everything.
- Payouts go out automatically when the business approves the work. A raised dispute stops this until an admin decides.
- Real money movement (payouts and refunds) depends on Razorpay keys. Until they are added, payouts and refunds are recorded in test mode (MOCKED) and shown as such in the panel.
- Reports can be filed by any logged-in user. One user can report the same item only once.
- Money figures are in INR. Platform earnings are the 10% fee on paid deals plus ₹999/month Pro subscriptions.
- The existing admin features (creator approval, deals and payout view) are folded into this new panel, not kept separately.
