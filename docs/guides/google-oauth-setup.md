# Google OAuth Setup Guide

## Problem Fixed

The "Error 400: invalid_request - Access blocked: Authorization Error" occurred because the app was using a **Web Application OAuth Client ID** for Android authentication.

**Root Cause:**
- expo-auth-session uses custom scheme redirect URIs (e.g., `walkingapp://`)
- Google Web Application OAuth clients do NOT accept custom scheme redirect URIs
- Android apps require an **Android OAuth Client ID** in Google Cloud Console

## Solution

The fix separates the OAuth client IDs:
- **GOOGLE_WEB_CLIENT_ID**: Web Application client (used for iOS fallback)
- **GOOGLE_ANDROID_CLIENT_ID**: Android client (used for Android app)

## Setup Instructions

### Prerequisites

1. Access to Google Cloud Console: https://console.cloud.google.com/
2. A Google Cloud project created for Walking App
3. Android development environment set up

### Step 1: Get Your SHA-1 Certificate Fingerprint

The Android OAuth client requires your app's SHA-1 certificate fingerprint.

#### For Debug Builds (Development):

```bash
cd WalkingApp.Mobile/android
./gradlew signingReport
```

**Output will look like:**
```
Variant: debug
Config: debug
Store: /Users/yourname/.android/debug.keystore
Alias: androiddebugkey
MD5: A1:B2:C3:...
SHA1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
SHA-256: FA:C6:...
```

**Copy the SHA1 value** (the long hex string like `5E:8F:16:...`)

#### For Release Builds (Production):

You'll need the SHA-1 from your release keystore. If you haven't created one yet, you'll do this later when preparing for production.

### Step 2: Create Android OAuth Client ID

1. **Open Google Cloud Console**
   - Go to: https://console.cloud.google.com/
   - Select your Walking App project

2. **Navigate to Credentials**
   - Click: **APIs & Services** → **Credentials**

3. **Create New OAuth Client ID**
   - Click: **"+ Create Credentials"**
   - Select: **"OAuth client ID"**

4. **Configure Android Client**
   - **Application type**: Select **Android**
   - **Name**: `Walking App Android` (or any descriptive name)
   - **Package name**: `com.walkingapp.mobile`
     - This MUST match the package name in `WalkingApp.Mobile/app.json`
     - Current value in app.json: `"package": "com.walkingapp.mobile"`
   - **SHA-1 certificate fingerprint**: Paste the SHA-1 from Step 1

5. **Create the Client**
   - Click **Create**
   - You'll see a confirmation dialog with your Client ID

6. **Copy the Client ID**
   - The Client ID will look like: `123456789-abc123def456.apps.googleusercontent.com`
   - Copy this value

### Step 3: Update Environment Variables

1. **Open `.env` file** (create if it doesn't exist):
   ```bash
   cd WalkingApp.Mobile
   cp .env.example .env  # If you don't have a .env file yet
   ```

2. **Add the Android Client ID**:
   ```env
   # Google OAuth Configuration
   GOOGLE_WEB_CLIENT_ID=547443886830-gj4l6tfdtbcs151sgiq4dfr40uigefdg.apps.googleusercontent.com
   GOOGLE_ANDROID_CLIENT_ID=YOUR_ANDROID_CLIENT_ID_HERE.apps.googleusercontent.com
   ```

3. **Replace** `YOUR_ANDROID_CLIENT_ID_HERE` with the Client ID you copied in Step 2

### Step 4: Rebuild the App

After updating the `.env` file, you MUST rebuild the app for changes to take effect:

```bash
# Clean previous builds
cd WalkingApp.Mobile
rm -rf android/app/build

# Rebuild and run
npx expo run:android
```

### Step 5: Test Google Sign-In

1. Run the app on your Android device/emulator
2. Navigate to the Login screen
3. Tap "Sign in with Google"
4. You should now see the Google account picker without errors
5. Select an account and authorize
6. You should be successfully authenticated

## Troubleshooting

### Error: "Error 400: invalid_request"

**Cause**: Still using Web Client ID for Android

**Solution**:
- Verify you created an **Android** OAuth client (not Web Application)
- Verify `GOOGLE_ANDROID_CLIENT_ID` is set in `.env`
- Verify you rebuilt the app after changing `.env`

### Error: "Error 400: redirect_uri_mismatch"

**Cause**: This error shouldn't occur with Android OAuth clients (they don't use redirect URIs)

**Solution**:
- If you see this, you may have created a Web Application client instead of Android
- Go back to Step 2 and create an **Android** client type

### Error: "Error 10: Developer Error"

**Cause**: SHA-1 fingerprint mismatch

**Solution**:
- Verify the SHA-1 in Google Cloud Console matches your debug keystore
- Run `cd android && ./gradlew signingReport` again
- Update the SHA-1 in Google Cloud Console
- Changes may take a few minutes to propagate

### Error: "Package name mismatch"

**Cause**: Package name in Google Cloud Console doesn't match app.json

**Solution**:
- Verify package name in Google Cloud Console is: `com.walkingapp.mobile`
- Verify `app.json` has: `"android": { "package": "com.walkingapp.mobile" }`
- Update Google Cloud Console if needed

## Important Notes

### Multiple Environments

For production builds, you'll need a separate OAuth client with your **release SHA-1**:

1. Create a **second Android OAuth client** for production
2. Use your release keystore SHA-1 fingerprint
3. Store the production client ID securely
4. Use environment-specific configuration in your build process

### iOS Configuration

For iOS, you'll need to create an **iOS OAuth client** separately:

1. Go to Google Cloud Console → Credentials
2. Create OAuth client ID → iOS
3. Add your iOS bundle identifier: `com.walkingapp.mobile`
4. Add the iOS client ID to `GOOGLE_IOS_CLIENT_ID` in `.env`
5. Update `useGoogleAuth.ts` to use `iosClientId` parameter

### Security Best Practices

1. **Never commit `.env` to git** - It's in `.gitignore`
2. **Keep client IDs secure** - They're sensitive credentials
3. **Use different client IDs** for debug and release builds
4. **Rotate credentials** if they're ever exposed

## Architecture

### How OAuth Flow Works

1. User taps "Sign in with Google"
2. `useGoogleAuth.ts` hook initiates OAuth flow
3. expo-auth-session opens Chrome Custom Tabs (Android) or Safari (iOS)
4. User authenticates with Google
5. Google redirects to `walkingapp://` with authorization code
6. expo-auth-session exchanges code for ID token
7. App receives `idToken` and `accessToken`
8. App sends `idToken` to Supabase for authentication

### Why Android Client ID is Required

- **Custom Scheme Redirects**: Android apps use custom schemes (`walkingapp://`)
- **Web Client Limitation**: Web OAuth clients only accept `http://` or `https://` redirects
- **Android Client Design**: Android OAuth clients don't require redirect URI configuration
- **Automatic Handling**: Google automatically handles the redirect for Android apps

### Client ID Usage

```typescript
Google.useIdTokenAuthRequest({
  clientId: GOOGLE_WEB_CLIENT_ID,           // Used for iOS/fallback
  androidClientId: GOOGLE_ANDROID_CLIENT_ID, // Used for Android
  iosClientId: GOOGLE_IOS_CLIENT_ID,         // (Optional) for iOS
  redirectUri: makeRedirectUri({
    scheme: 'walkingapp',
  }),
});
```

## References

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Expo Auth Session](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Expo Google Auth](https://docs.expo.dev/guides/google-authentication/)

## Support

If you encounter issues not covered here:

1. Check the expo-auth-session logs
2. Verify all client IDs are correctly configured
3. Ensure SHA-1 fingerprints match
4. Try clearing app data and rebuilding
5. Check Google Cloud Console for any error messages

## Next Steps

After successful Google OAuth setup:

1. Test the full authentication flow
2. Verify Supabase integration works
3. Test on both debug and release builds
4. Set up iOS OAuth client (if building for iOS)
5. Configure production OAuth clients before release
