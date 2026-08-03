# Dare — Android App

A real native Android app (built with [Capacitor](https://capacitorjs.com)) for the
**Dare Digital Repository**. It's not a shortcut/bookmark: it's a proper app with a
launcher icon, splash screen, native status bar, native back-button navigation,
pull-to-refresh, and an offline fallback screen — wrapping the live repository at
**https://repo.dare.co.zw**.

> **Important — read before building.** This source was generated and hand-edited in
> a sandboxed environment with no Android SDK and no access to Google's Maven
> repository (where the Android Gradle Plugin and AndroidX libraries are hosted), so
> it has **not been compiled here**. Every piece — the Capacitor scaffold, the
> generated icon/splash resources, the manifest, and `MainActivity.java` — was built
> against the actual Capacitor 8.5.0 source (checked directly in `node_modules`, not
> guessed from memory), but you should do a first build on a machine with Android
> Studio before shipping it, in case anything needs a small fix.

## What's in here

```
mobile/dare-android/
├── capacitor.config.json   # points the app at repo.dare.co.zw; offline fallback; brand colours
├── www/
│   ├── index.html          # unused at runtime (Capacitor requires a webDir) — see comment inside
│   └── offline.html        # shown natively whenever the app can't reach the repository
├── assets/                 # source icon.png / icon-foreground.png / icon-background.png / splash.png
├── android/                # the native Android Studio project (generated + customised)
│   └── app/src/main/java/zw/co/chengetailabs/dare/MainActivity.java   # pull-to-refresh
└── package.json
```

## How it works

- **Content**: `capacitor.config.json` sets `server.url` to `https://repo.dare.co.zw`,
  so the app's WebView loads the live repository directly — there's nothing to keep in
  sync, updates to the site show up in the app immediately.
- **Scope / external links**: `server.allowNavigation` is scoped to `dare.co.zw` and
  `*.dare.co.zw` (covers `repo.dare.co.zw`, `bulawayopolytechnicrepository.dare.co.zw`
  and any future Dare-network subdomain). Links to anything outside that (e.g. a cited
  external DOI) automatically open in the system browser instead of getting trapped in
  the app — this is Capacitor's default behaviour, untouched.
- **Offline handling**: `server.errorPath` is set to `offline.html`. This is a built-in
  Capacitor mechanism (verified in `node_modules/@capacitor/android/.../Bridge.java`) —
  on any main-frame load failure (no connection, DNS failure, timeout, etc.) the WebView
  is redirected to the bundled `www/offline.html`, which has a "Try Again" button. No
  custom native error-handling code was needed for this.
- **Pull-to-refresh**: `MainActivity.java` wraps the WebView in a `SwipeRefreshLayout`
  (a small, standard AndroidX customisation) so users can pull down to reload the
  current page.
- **Back button**: handled automatically by Capacitor (navigates WebView history, exits
  the app at the root) — no custom code needed.
- **Deep links**: `AndroidManifest.xml` declares an App Links intent-filter for
  `dare.co.zw` and `*.dare.co.zw`, so tapping a Dare link elsewhere on the phone can
  open directly in the app instead of a browser. For
  Android to trust this (`android:autoVerify="true"`) without a security warning,
  publish a Digital Asset Links file at
  `https://repo.dare.co.zw/.well-known/assetlinks.json` — see
  [Google's guide](https://developer.android.com/training/app-links/verify-android-applinks)
  and use the release keystore's SHA-256 fingerprint (from the signing step below).
  The app still works without this — Android just won't auto-verify the link
  ownership, so those links may prompt a chooser instead of opening directly.
- **Branding**: icon and splash were generated programmatically (`assets/icon.png`,
  `assets/splash.png`) in the site's green/gold palette with a simple archive-box
  glyph, then expanded into all densities via `@capacitor/assets`. Swap the source
  PNGs in `assets/` and re-run `npm run assets` any time you want to update the look.

## Build it (Android Studio — easiest)

1. Install [Android Studio](https://developer.android.com/studio) (includes the
   Android SDK).
2. `cd mobile/dare-android && npm install`
3. `npm run open` — opens `android/` in Android Studio (or open it manually via
   *File → Open*).
4. Let Gradle sync (first run downloads the Android Gradle Plugin + AndroidX — this
   is exactly the step that isn't possible in the sandbox this was built in).
5. Click **Run** to install a debug build on a device/emulator, or
   **Build → Generate Signed Bundle / APK** for a release build.

## Build it (command line)

Requires the Android SDK + `ANDROID_HOME`/`local.properties` set up (Android Studio
does this for you automatically on first open — easiest to do step above once, then
you can use the CLI afterwards).

```bash
cd mobile/dare-android
npm install
npm run build:debug      # → android/app/build/outputs/apk/debug/app-debug.apk
```

## Release build (signed, for repo.dare.co.zw)

1. Generate a keystore (once — keep it safe, you'll need it for every future update).
   When prompted for the key password, press **Enter** to reuse the keystore
   password rather than setting a different one — PKCS12 (the default format
   on modern JDKs) ties the two together, and a mismatched key password
   causes a `Given final block not properly padded` error when Gradle later
   tries to sign with it:
   ```bash
   keytool -genkeypair -v -keystore dare-release.keystore -alias dare \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Add signing config to `android/app/build.gradle` (or use Android Studio's
   *Generate Signed Bundle/APK* wizard, which does this interactively without
   editing files).
3. Build:
   ```bash
   npm run build:release   # → android/app/build/outputs/apk/release/app-release.apk
   ```
4. Upload the resulting `.apk` to **repo.dare.co.zw** for the website's download
   button to serve.

## Updating the app later

- **Content changes** (new pages, features on the repository itself): nothing to do —
  the app always loads the live site.
- **App-level changes** (icon, splash, offline page, app name, permissions): edit the
  relevant file, run `npm run sync`, rebuild, and re-sign with the *same* keystore
  (a mismatched signature means users can't install the update over the old one).
- Bump `versionCode` / `versionName` in `android/app/build.gradle` before each release
  build.

## Package / app ID

- App ID: `zw.co.chengetailabs.dare`
- App name: `Dare`

Changing the App ID after publishing means Android treats it as a different app
(users can't update in place) — treat it as fixed once you've shipped a version.
