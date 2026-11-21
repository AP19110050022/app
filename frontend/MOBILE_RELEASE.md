# Mobile Store Releases

The iOS and Android projects bundle the existing React app with Capacitor. App ID: `co.hireavatar.app`. Native source projects are in `ios/` and `android/`.

## Build and sync

Use Node.js 22 or newer and Yarn 1. The React build embeds `REACT_APP_BACKEND_URL`, so set it to the production HTTPS API endpoint before building; do not commit secrets.

```sh
yarn cap:assets
yarn cap:sync
```

For Android, install Android Studio, JDK 21, and Android SDK 36, then run `yarn cap:open:android`. In Android Studio, configure release signing and generate a signed Android App Bundle (AAB). Increment `versionCode` in `android/app/build.gradle` for every Play Store release.

For iOS, use macOS with Xcode and CocoaPods, then run `yarn cap:open:ios`. Select the Apple Developer team and configure signing in Xcode, then create an Archive and upload it to App Store Connect. Increment the version/build number in the Xcode project for every release.

## Before submission

- Test account creation, sign-in, sign-out, session restore, and any social sign-in on physical iOS and Android devices. Configure Clerk’s OAuth redirect/deep-link settings if a provider returns to the browser instead of the app.
- Test real payment flows on both platforms. Apple and Google may require their in-app purchase APIs for digital subscriptions or app features; external checkout is generally for physical goods and services. Confirm the classification of every paid offering before submission.
- Provide store listing screenshots, privacy policy and support URLs, age ratings, App Privacy/Data safety disclosures, and review credentials where required.
- Verify backend CORS, authentication callbacks, file uploads, and payment return URLs against the production domains.

This workspace can generate and sync the native projects, but signed store builds require the platform toolchains and developer accounts above. Store approval also depends on the listed product and policy checks.
