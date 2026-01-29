# Stepper

A mobile application for tracking steps and distance, competing with friends and groups.

## Project Structure

- `Stepper.Api/` - .NET 10 Backend API

## Features

- Step and distance tracking
- Friend system
- Group competitions
- Real-time leaderboards

## Tech Stack

- Backend: .NET 10 Web API
- Frontend: Expo (React Native) - Coming soon
- Database: TBD

## Getting Started

### Backend API

```bash
cd Stepper.Api
dotnet run
```

The API will be available at `https://localhost:5001`

### Frontend (Expo/React Native)

#### Quick Start

```bash
cd Stepper.Mobile
npm install
npm run android
```

#### Android Development Setup

To run the app on Android, you need to set up the Android development environment.

**See**: [Android Emulator Setup Guide](docs/ANDROID_EMULATOR_SETUP.md) for detailed instructions.

**Quick Setup Checklist**:
1. Install Android Studio
2. Install Android SDK (API 34)
3. Configure environment variables (ANDROID_HOME)
4. Create Android Virtual Device (AVD)
5. Verify setup: `./verify-android-setup.sh`

**Common Commands**:
```bash
# Start on Android emulator
npm run android

# Start on physical Android device
npm run android:device

# Verify Android environment
./verify-android-setup.sh
```

#### Troubleshooting

If you encounter issues:
- Run the verification script: `./verify-android-setup.sh`
- See [Android Setup Guide - Troubleshooting](docs/ANDROID_EMULATOR_SETUP.md#troubleshooting)
- Ensure emulator is running: `adb devices`
- Restart Expo dev server: `npm start`
