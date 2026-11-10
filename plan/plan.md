# HireAvatar — Fix Sign-In on the Live Site (www.hireavatar.co)

People can't sign in on the live site. After they log in, they land back on the sign-in or sign-up page.
This fix makes Google and email + password sign-in work on www.hireavatar.co, as they already do on the preview.

## Who it's for
- **Everyone using the live site:** creators, businesses and admins (including the main admin) who sign in at www.hireavatar.co.

## Core features and experience
**1. Find the exact cause on the live site**
- Check the live sign-in setup, which the preview doesn't show:
  - which sign-in keys the live site uses
  - which web addresses the sign-in service accepts
  - where the live site sends its sign-in and app requests
  - whether the live server rejects people right after they log in
- The most likely cause: the live sign-in service was set up for the earlier address (brandface.emergent.host) and doesn't yet trust www.hireavatar.co. Or the site and its server run on different addresses, so the browser drops the sign-in session, the app thinks the person is signed out, and sends them back to the login page.

**2. Fix it**
- Make www.hireavatar.co a trusted address for sign-in, for both Google and email + password.
- Make the live site keep the sign-in session on the same address the person is on. Then a successful login stays signed in, and they land in the app (Discover) instead of the login page.
- Make hireavatar.co (without "www") open the www address, so sign-in always happens on one address.
- Keep the earlier address brandface.emergent.host working as a backup.

**3. Clear message instead of a loop**
- If sign-in still fails for some reason, show a short message ("We couldn't finish signing you in. Try again.") with a Try again button, instead of silently going back to the login page.
- A blocked account still sees the existing "Your account is blocked" screen.

**4. Confirm on the live site**
- Sign in on www.hireavatar.co with Google and with email + password, on phone and desktop.
- Each one must land in the app and stay signed in after a refresh.
- The main admin must still see the Admin entry.

## User flow
1. A person opens www.hireavatar.co and taps "Log in" or "Create account".
2. They continue with Google, or enter their email and password.
3. They land on Discover, signed in, and stay signed in when they refresh or come back later.
4. If anything goes wrong, they see a clear message with a Try again button, not a loop.

## UI/UX feel
- The sign-in and sign-up pages look the same as today: same dark violet style, Google button on top, email below.
- No visible change except the friendly error message when something fails.

## Implementation phases
- **Phase 1 (built now):** find the cause on the live site, make www.hireavatar.co trusted for Google and email sign-in, keep sessions on the same address, send hireavatar.co to www, add the clear failure message, and re-publish so the fix goes live.
- **Phase 2:** sign-in health check in the admin panel (failed sign-ins per day), and a "Signed in from a new device" notice for users.
- **Phase 3:** extra sign-in options (phone number with OTP, Apple sign-in for the app-store version), and two-step verification for admins.

## Assumptions
- The problem is only on the live site. The preview sign-in works and stays as it is.
- Sign-in methods stay the same as today: Emergent-managed Google sign-in plus email and password. There's no separate built-in admin password account. The main admin stays ganeshreddypittu111@gmail.com.
- Existing accounts and their data are kept. Nobody has to sign up again.
- If the live sign-in service needs a setting only the account owner can change (for example a domain record at the domain provider), a short step-by-step note will be given to do it.
- The fix needs a re-publish to reach www.hireavatar.co.
- The earlier questions about the app stores and security audit aren't part of this fix:
  - Google Play and the App Store need a mobile version of the app, which is a separate project.
  - The security audit and the file and media storage requests are still pending and will be handled after sign-in works.
