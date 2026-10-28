# HireMyFace — Rebuild Plan

A marketplace where businesses hire creators and presenters to be the face of their brand on social media.
Everyone signs up the same way, then picks a role (Creator or Business) from a "+" button on the home screen. Businesses send offers, chat and pay inside the app.

## Who it's for
- **Creators / presenters**: people who want paid work fronting brands in reels, shorts, ads and live sessions.
- **Businesses**: shops, startups, agencies and brands in India that need a face for their social media.
- **Admin (you)**: approves profiles, watches payments, releases creator payouts and handles disputes.

## Core features and experience
**Login (styled like Instagram / LinkedIn)**
- Continue with Google, or email + password (with forgot password and email verification).
- Mobile number (OTP) login is not in phase 1. Phone number is collected on the profile instead.

**One account, choose your role with "+"**
- Everyone lands on the same home feed after sign-up.
- The "+" button opens: "Become a Creator" or "Hire as a Business". One account can hold both and switch between them.

**Creator profile setup (short 3-step form)**
1. Basics: photo, name, city, languages, category (Fashion, Food, Tech, Fitness, Beauty, Education, Real estate, Other).
2. Showcase: intro video link, up to 6 sample photos/video links, social handles and follower counts.
3. Rates: the three plans below. The creator sets their own prices.

**The three plans (same everywhere in the app)**
| Plan | What the business gets | How the price works |
|---|---|---|
| Per Video | One finished video (reel/short/ad), 1 revision | "From ₹X per video", set by the creator |
| Part-time | Up to 8 videos a month + 1 live/shoot day | Monthly price set by the creator |
| Full-time | Dedicated brand face, up to 20 videos a month, exclusive in their category | Monthly price set by the creator |

**Business profile setup (short 2-step form)**
1. Company name, logo, industry, city, website/Instagram.
2. What they usually need: plan type, budget range, languages.

**Discover and filter**
- Home feed of creator cards (photo, name, city, category, "From ₹X", rating).
- One simple filter sheet: Category, City, Language, Plan, Price range, Gender. Sort by: Recommended, Price low→high, Newest.
- Save creators to a shortlist.

**Offers**
- A business picks a creator and a plan, adds a short brief, date and price (pre-filled from the creator's rate), then sends the offer.
- The creator can accept, decline or send a counter-price.
- Tracked under "My Deals": Pending → Accepted → Paid → Delivered → Completed.

**Chat**
- In-app chat opens once an offer is sent.
- Phone numbers, emails and outside links typed in chat are hidden until the deal is paid, so people can't skip the app before paying.

**Payments (Razorpay, ₹ INR)**
- The business pays the agreed amount into the app via Razorpay (UPI, cards, netbanking).
- The money is held until the business marks the work as delivered. Admin then releases the payout to the creator.
- The platform keeps a 10% service fee from each deal.

**How the app makes money**
- **Business subscription**:
  - Free: browse, filter, shortlist, 2 offers a month, no chat.
  - **Business Pro — ₹999/month**: unlimited offers, chat, in-app payments, "Verified business" badge.
  - Free businesses must upgrade to Pro before they can chat or pay.
- **10% service fee** on every paid deal.
- Creators join free, which keeps the supply of creators growing.

**Other screens**
- Notifications (new offer, reply, payment, message).
- Profile and settings: edit profile, switch role, subscription, payout details (UPI ID / bank), log out, delete account.
- Ratings: after a deal is completed, the business rates the creator and the rating shows on the creator's card.
- Admin panel: users, approve or hide profiles, deals, payments, release payouts, subscriptions.
- Public landing page that explains the app, the plans and pricing, with Sign up / Log in buttons.

## User flow
1. A visitor opens the landing page and taps Sign up, then uses Google or email.
2. They land on the home feed of creators and tap "+".
3. **Creator path**: fill in the 3-step profile and go live after admin approval. They then receive offers, chat, deliver the work and get paid.
4. **Business path**: fill in the 2-step profile, filter creators, open a profile and send an offer. The business upgrades to Pro to chat and pay. It then pays in the app, marks the work delivered and rates the creator.
5. The admin releases the payout to the creator.

## UI/UX feel
- Violet, blue and purple brand colours, with clean white cards and bold, modern type.
- Mobile-first, app-like layout: bottom navigation (Home, Search, +, Deals, Chat, Profile) on phones, side navigation on desktop.
- Login and sign-up pages look like Instagram or LinkedIn: a centred card with the logo, "Continue with Google" and email fields. On desktop a side panel shows creator imagery.
- Lively icons, smooth hover and tap animations, and clear status badges on deals.
- The old confusing screens and names are replaced by the single flow above.

## Implementation phases
**Phase 1 — MVP (built now)**
- Landing page, Google + email login, the "+" role chooser, creator and business profile forms.
- Home feed, filters, shortlist, creator profile page.
- Offers with accept/decline/counter, the deal tracker, in-app chat with contact hiding.
- Razorpay payments for deals and the Business Pro subscription (test mode), 10% fee, payouts held and released by admin.
- Ratings, notifications, settings, admin panel. Ready to publish as a website.

**Phase 2**
- Mobile number OTP login.
- Automatic payouts to creators.
- "Featured creator" paid boost.
- Email alerts for offers and messages.

**Phase 3**
- International payments and currencies.
- Phone apps for Android and iOS.
- AI matching of creators to briefs.
- Contracts and invoices as PDFs.

## Assumptions
- The existing project zip is used as a reference for names and content only. The app is rebuilt from scratch with the new structure.
- Phone login is moved to phase 2 because the chosen login system supports Google and email only. Phone OTP needs a separate SMS provider.
- The monetisation model is: Business Pro at ₹999/month, plus a 10% fee per deal, with creators free. The prices are placeholders you can change.
- Part-time means up to 8 videos a month and Full-time means up to 20 videos a month with category exclusivity. These limits are defaults you can edit.
- Creators set their own prices for all three plans.
- Payouts to creators are released by the admin in phase 1 and become automatic in phase 2.
- Razorpay test keys are requested securely at build time. Until they are added, payments run in test mode only.
- During the build you'll be asked for the email address that should be the first admin.
- New creator profiles need admin approval before they appear in search.
- The app is in English only and the currency is ₹ INR.
