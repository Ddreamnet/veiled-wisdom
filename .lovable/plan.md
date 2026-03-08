

# iOS Asset Generation — Implementation Plan

## Steps

1. **Replace source assets**
   - Copy `user-uploads://icon-only.png` → `assets/icon-only.png`
   - Copy `user-uploads://splash.png` → `assets/splash.png`

2. **Verify `@capacitor/assets` availability**, install if needed

3. **Generate iOS assets**
   - `npx capacitor-assets generate --ios`
   - This reads from `assets/` and outputs to `ios/App/App/Assets.xcassets/`

4. **Sync iOS project**
   - `npx cap sync ios`

5. **Verify output** — confirm updated files in:
   - `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
   - `ios/App/App/Assets.xcassets/Splash.imageset/`

6. **Report** — list all generated/changed files, commands run, and any errors

## Android Impact

Android is **not affected**. The pre-generated PNGs in `android/app/src/main/res/mipmap-*/` and `drawable-*/` are already committed and won't change. Only running `npx capacitor-assets generate --android` in the future would regenerate them from the new source assets.

