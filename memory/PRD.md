# HireMyFace — PRD

## Original problem statement
"this is the project iam working on. it is a plaform where people can get hire as creators or presenters to be a face of a business for promotion on social media. and also people/businesses can give offers. it is very naive stage, there are many confusions regarding plans, payments, login setup, ui features and placement, designs,etc. can you make it in to a complete workable app and make changes where ever possible, you can chnage the placements, theme, etc. (also how about people login to it normally and then they can decide whether to become creator or business people who hire by pressing + icon in the home page). also the total placements, names, features seems so confusing and also i think there are feature to delete or re arrange and features to add. U are expert in it. look at any existing apps and remake this app. but include that violet or blue or purple color theme, you can add more attracting icons,etc in the pages including signup or login page. also the signup or login page should be like any other login page in instagram or snapchat or likedin,etc where people can login using email or gmaul whcih supports you. also tehre are confusion in filter,creator filling page, business filling page etc. so make a complete app with all encessary changes and website which can be deployable. also reduce the consfusion in plans by simply three plans like per video (price starts from), parttime, fulltime."
Follow-up: "follow that theme (zip file), look like a social media app, not a job portal/blog". Edit: replace top-bar chat icon with Saved (creators or businesses).

## Architecture
- FastAPI + MongoDB (`/app/backend/server.py`, `clerk_auth.py`, `seed.py`), React + Tailwind + shadcn.
- Auth: Emergent-managed Clerk (Google + email/password). Roles admin/member in `users` collection; first admin via ADMIN_EMAIL (not set yet).
- Payments: Razorpay orders + signature verify; falls back to simulated TEST mode while RAZORPAY_KEY_ID/SECRET are missing.
- Theme: dark indigo→violet gradient, glass UI, white floating pill bottom nav with "+" FAB, Instagram-style creator profile (reference: user's zip "presenta").

## Personas
Creators/presenters, businesses (Free / Pro ₹999 per 30 days), admin.

## Core requirements
One account, + chooser (creator 3 steps / business 2 steps); 3 plans Per Video / Part-time (≤8 videos+1 shoot day) / Full-time (≤20 videos, category exclusive); discover + filters; offers with accept/decline/counter; deal pipeline pending→accepted→paid→delivered→completed; chat per deal with contact masking until paid; Free = 2 offers/month, no chat/pay; 10% fee from creator payout; admin approves creators and releases payouts; ratings; notifications; saved creators & businesses.

## Implemented (2026-10-28)
- All of the above end-to-end; iteration_1 test: backend 26/26, frontend all flows passed.
- Fixes after test: atomic/idempotent payment verify (deal must be accepted), date not masked as phone, name/photo change re-queues approval, saved validates target, sample creators show no fake ratings, logout → landing, specific deal toasts.
- Saved now supports creators and businesses; top bar: Search, Saved, Notifications.

## Backlog
- P0: Add Razorpay keys (payments currently MOCKED test mode); set ADMIN_EMAIL.
- P1: Phone OTP login, automatic payouts (Razorpay Route), email alerts, calendar date picker in offer dialog.
- P2: Featured boost, AI matching, PDF contracts/invoices, mobile apps, multi-currency.
