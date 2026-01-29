# Android Emulator Setup Guide

Complete guide for setting up Android Studio, Android SDK, and Android Virtual Device (AVD) for developing the Stepper.

## Android Version Information (January 2026)

**Current Android Versions:**
- **Android 16 (API 36, "Baklava")** - Latest version (13.3% adoption)
- **Android 15 (API 35)** - **Required minimum** for Google Play submissions

**Important**: This guide uses Android 16 (API 36) as the primary development target. Google Play requires all new apps and updates to target API Level 35 or higher as of January 2026.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Android SDK Configuration](#android-sdk-configuration)
4. [Environment Variables](#environment-variables)
5. [WSL2 Integration](#wsl2-integration)
6. [Creating AVD](#creating-avd)
7. [Verification](#verification)
8. [Testing with Expo](#testing-with-expo)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Operating System**: Windows 10/11 (64-bit) with WSL2
- **RAM**: Minimum 8GB (16GB recommended)
- **Disk Space**: At least 10GB free space for Android SDK
- **Processor**: Intel/AMD with virtualization support
- **Virtualization**: Must be enabled in BIOS

### Check Virtualization Support

Open PowerShell as Administrator and run:

```powershell
# Check if virtualization is enabled
Get-ComputerInfo | Select-Object -Property "HyperV*"
```

If virtualization is not enabled:
1. Restart computer and enter BIOS (usually F2, F10, or Del during boot)
2. Find "Virtualization Technology" or "VT-x" setting
3. Enable it and save changes

### Verify WSL2

In PowerShell:

```powershell
wsl --list --verbose
```

You should see your WSL distribution running version 2.

## Installation

### Step 1: Download Android Studio

1. Visit [Android Studio Download Page](https://developer.android.com/studio)
2. Download the Windows installer (android-studio-{version}-windows.exe)
3. File size is approximately 1GB

### Step 2: Run Installer

1. **Double-click** the downloaded `.exe` file
2. Click "Next" on the welcome screen
3. **Choose Components**: Ensure these are checked:
   - Android Studio
   - Android Virtual Device
4. Click "Next"
5. **Installation Location**: Default is `C:\Program Files\Android\Android Studio`
   - You can change this if needed
   - Click "Next"
6. **Start Menu Folder**: Keep default
   - Click "Install"
7. Wait for installation (this may take 5-10 minutes)
8. Click "Finish" and launch Android Studio

### Step 3: Initial Setup Wizard

1. **Import Settings**: Select "Do not import settings"
   - Click "OK"
2. **Data Sharing**: Choose your preference
3. **Welcome Screen**: Click "Next"
4. **Install Type**: Select "Standard"
   - This installs recommended settings and SDK components
   - Click "Next"
5. **UI Theme**: Choose your preference (Darcula or Light)
   - Click "Next"
6. **Verify Settings**: Review the components to be installed
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device
   - Click "Next"
7. **License Agreement**: Accept all licenses
   - Click "Finish"
8. Wait for SDK downloads (this may take 10-20 minutes depending on internet speed)

## Android SDK Configuration

### Step 1: Open SDK Manager

From Android Studio welcome screen:
1. Click "More Actions" (three dots icon)
2. Select "SDK Manager"

Alternatively, if a project is open:
- Go to **Tools** > **SDK Manager**

### Step 2: Install SDK Platforms

In the "SDK Platforms" tab:

1. **Check** "Show Package Details" at bottom-right
2. Select these platforms:
   - **Android 16.0 (Baklava)** - API Level 36 (Latest)
     - Android SDK Platform 36
     - Google APIs Intel x86_64 Atom System Image
   - **Android 15.0** - API Level 35 (Minimum for Google Play)
     - Android SDK Platform 35
     - Google APIs Intel x86_64 Atom System Image
   - **Android 14.0 (UpsideDownCake)** - API Level 34 (Optional - for backward compatibility testing)
     - Android SDK Platform 34
     - Google APIs Intel x86_64 Atom System Image
3. Click "Apply"
4. Click "OK" to confirm
5. Accept license agreements
6. Click "OK" to begin download
7. Wait for installation to complete (10-20 minutes)
8. Click "Finish"

**Note**: As of January 2026, Google Play requires apps to target API Level 35 (Android 15) or higher. Android 16 (API 36) is the latest version with 13.3% adoption.

### Step 3: Install SDK Tools

In the "SDK Tools" tab:

1. **Check** "Show Package Details" at bottom-right
2. Ensure these are installed (check if not installed):
   - **Android SDK Build-Tools** (latest version)
   - **Android SDK Command-line Tools** (latest)
   - **Android SDK Platform-Tools** (latest)
   - **Android Emulator** (latest)
   - **Google Play services**
   - **Intel x86 Emulator Accelerator (HAXM installer)**
     - Important for emulator performance on Intel CPUs
3. Click "Apply" if any changes made
4. Click "OK" to confirm
5. Wait for installation
6. Click "Finish"

### Step 4: Note SDK Location

In SDK Manager, note the "Android SDK Location" path at the top.

Default location:
```
C:\Users\{YourUsername}\AppData\Local\Android\Sdk
```

You'll need this for environment variables.

## Environment Variables

Setting up environment variables allows command-line tools (like `adb` and `emulator`) to work from any directory.

### Step 1: Open Environment Variables

1. Press **Windows Key + R**
2. Type `sysdm.cpl` and press Enter
3. Click "Advanced" tab
4. Click "Environment Variables" button

### Step 2: Create ANDROID_HOME

In "User variables" section:

1. Click "New"
2. **Variable name**: `ANDROID_HOME`
3. **Variable value**: Your SDK path (from SDK Manager)
   ```
   C:\Users\{YourUsername}\AppData\Local\Android\Sdk
   ```
4. Click "OK"

### Step 3: Update PATH

In "User variables" section:

1. Find and select "Path" variable
2. Click "Edit"
3. Click "New" and add these entries one at a time:
   ```
   %ANDROID_HOME%\platform-tools
   %ANDROID_HOME%\emulator
   %ANDROID_HOME%\tools
   %ANDROID_HOME%\tools\bin
   ```
4. Click "OK" on all dialogs

### Step 4: Verify Environment Variables

Open a **new** Command Prompt or PowerShell window and run:

```powershell
# Check ANDROID_HOME
echo %ANDROID_HOME%

# Check ADB
adb version

# Check emulator
emulator -version
```

If commands are not found, restart your computer and try again.

## WSL2 Integration

Since this project uses WSL2 for development, you need to access Windows Android tools from Linux.

### Step 1: Create Windows Path Helpers

In WSL2, the Windows PATH is available at `/mnt/c/Users/{YourUsername}/AppData/Local/Android/Sdk`.

Add these to your `~/.bashrc` or `~/.zshrc`:

```bash
# Android SDK - Access Windows installation from WSL2
export ANDROID_HOME="/mnt/c/Users/{YourUsername}/AppData/Local/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
export PATH="$PATH:$ANDROID_HOME/emulator"
export PATH="$PATH:$ANDROID_HOME/tools"
export PATH="$PATH:$ANDROID_HOME/tools/bin"

# Helper aliases for Android tools
alias adb='adb.exe'
alias emulator='emulator.exe'
```

**Important**: Replace `{YourUsername}` with your actual Windows username.

### Step 2: Reload Shell Configuration

```bash
source ~/.bashrc
# or
source ~/.zshrc
```

### Step 3: Verify WSL Access

```bash
# Test ADB
adb version

# Test emulator
emulator -version

# List available AVDs (after creating one)
emulator -list-avds
```

### WSL2 Considerations

- **Emulator must run on Windows**: The Android emulator cannot run directly in WSL2
- **ADB works from WSL2**: You can use `adb` commands from WSL2 to interact with Windows emulators
- **Expo CLI in WSL2**: Run `npx expo start` from WSL2; it will detect Windows emulators via ADB

## Creating AVD

An Android Virtual Device (AVD) is a configuration that defines characteristics of an Android phone, tablet, or other device.

### Step 1: Open Device Manager

From Android Studio welcome screen:
1. Click "More Actions" (three dots)
2. Select "Virtual Device Manager"

Or if project is open:
- **Tools** > **Device Manager**

### Step 2: Create New Device

1. Click "Create Device" button
2. **Category**: Phone
3. **Device Definition**: Select **Pixel 7**
   - Screen: 6.3"
   - Resolution: 1080 x 2400
   - Density: 416 dpi (xhdpi)
4. Click "Next"

### Step 3: Select System Image

1. Click on "**Baklava**" tab (or find API Level 36)
2. Select:
   - **Release Name**: Baklava
   - **API Level**: 36
   - **ABI**: x86_64
   - **Target**: Android 16.0 (Google APIs)
3. If "Download" link appears, click it:
   - Accept license
   - Wait for download (1-2GB, may take 10-20 minutes)
4. Click "Next"

**Alternative**: You can also select API Level 35 (Android 15) if you prefer the minimum required version for Google Play.

### Step 4: Configure AVD

1. **AVD Name**: `Stepper_Pixel7_API36`
2. **Startup orientation**: Portrait
3. Click "Show Advanced Settings"

**Advanced Settings**:
- **Graphics**: Hardware - GLES 2.0 (recommended)
- **Device Frame**: Enable device frame (optional, for realistic appearance)
- **Memory and Storage**:
  - RAM: 2048 MB (or 4096 MB if you have 16GB+ host RAM)
  - VM heap: 256 MB
  - Internal Storage: 4096 MB
  - SD card: 512 MB
- **Emulated Performance**:
  - Boot option: Cold boot (or Quick boot for faster startup)
  - Multi-Core CPU: 4 cores (if your CPU has 8+ cores)
  - Graphics: Hardware

4. Click "Finish"

### Step 5: Verify AVD Creation

In Device Manager, you should see:
- **Stepper_Pixel7_API36**
- A play button to launch it

## Verification

Use the verification script to check your setup.

### Run Verification Script

From the project root in WSL2:

```bash
# Make script executable
chmod +x verify-android-setup.sh

# Run verification
./verify-android-setup.sh
```

The script checks:
- ANDROID_HOME environment variable
- Android SDK installation
- ADB availability and version
- Emulator binary availability
- Available AVDs
- Emulator launch capability (dry-run)

### Expected Output

```
=== Android Development Environment Verification ===

[✓] ANDROID_HOME is set
    Path: /mnt/c/Users/{YourUsername}/AppData/Local/Android/Sdk

[✓] Android SDK directory exists

[✓] ADB is available
    Version: Android Debug Bridge version 1.0.41

[✓] Emulator is available
    Version: Android emulator version 34.2.16.0

[✓] Available AVDs found:
    - Stepper_Pixel7_API36

[✓] All checks passed!
```

## Testing with Expo

### Step 1: Start Emulator

**Option A: From Android Studio**
1. Open Device Manager
2. Click play button next to "Stepper_Pixel7_API36"
3. Wait for emulator to boot (first boot takes 1-2 minutes)

**Option B: From Command Line (Windows)**
```powershell
emulator -avd Stepper_Pixel7_API36
```

**Option C: From WSL2**
```bash
emulator -avd Stepper_Pixel7_API36 &
```

### Step 2: Verify Emulator is Running

In WSL2:
```bash
adb devices
```

Expected output:
```
List of devices attached
emulator-5554   device
```

### Step 3: Start Expo Development Server

In WSL2, navigate to mobile project:

```bash
cd Stepper.Mobile

# Start Expo
npm run android
```

Or use the direct command:
```bash
npx expo start --android
```

### Step 4: Verify App Installation

- Expo CLI should detect the running emulator
- App should build and install automatically
- Stepper should launch on emulator
- You should see the app's splash screen or home screen

### Step 5: Test Hot Reload

1. Open `App.tsx` in your editor
2. Make a small change (e.g., change text)
3. Save the file
4. App should automatically reload on emulator with changes

## Troubleshooting

### Emulator Won't Start

#### Issue: "Intel HAXM is not installed"

**Symptoms**:
- Error message about HAXM
- Emulator is extremely slow
- VT-x errors

**Solutions**:

1. **Install HAXM from SDK Manager**:
   - Open SDK Manager
   - Go to SDK Tools tab
   - Check "Intel x86 Emulator Accelerator (HAXM installer)"
   - Click Apply

2. **Run HAXM installer manually**:
   ```powershell
   cd C:\Users\{YourUsername}\AppData\Local\Android\Sdk\extras\intel\Hardware_Accelerated_Execution_Manager
   intelhaxm-android.exe
   ```

3. **Check Hyper-V conflict**:
   - HAXM conflicts with Hyper-V
   - If using Docker Desktop or WSL2, you may need to use Android x86_64 image without HAXM
   - Or disable Hyper-V (not recommended if using WSL2)

#### Issue: "PANIC: Cannot find AVD system path"

**Solution**:
- Verify ANDROID_AVD_HOME environment variable
- Default location: `C:\Users\{YourUsername}\.android\avd`
- Recreate AVD if corrupted

#### Issue: Emulator window is black or frozen

**Solutions**:
1. Change Graphics mode:
   - Edit AVD settings
   - Change Graphics from "Automatic" to "Hardware" or "Software"
2. Update Graphics Drivers
3. Increase VM heap size in AVD settings

### ADB Connection Issues

#### Issue: "adb: device offline" or "adb: device unauthorized"

**Solutions**:
1. Restart ADB server:
   ```bash
   adb kill-server
   adb start-server
   ```

2. Check emulator is running:
   ```bash
   adb devices
   ```

3. Revoke USB debugging authorizations (on emulator):
   - Settings > Developer Options > Revoke USB debugging authorizations

#### Issue: "more than one device/emulator"

**Solution**: Specify device:
```bash
adb -s emulator-5554 <command>
```

### Expo Connection Issues

#### Issue: "Could not connect to development server"

**Solutions**:

1. **Check ADB can see emulator**:
   ```bash
   adb devices
   ```

2. **Restart Expo development server**:
   - Press Ctrl+C to stop
   - Run `npx expo start` again

3. **Clear Expo cache**:
   ```bash
   npx expo start --clear
   ```

4. **Reverse ADB port** (if using custom server):
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```

#### Issue: App crashes on startup

**Solutions**:

1. **Clear app data**:
   - Settings > Apps > Expo Go > Storage > Clear Data

2. **Reinstall Expo Go**:
   ```bash
   adb uninstall host.exp.exponent
   ```

3. **Check Metro bundler logs** for JavaScript errors

### Performance Issues

#### Issue: Emulator is very slow

**Solutions**:

1. **Increase RAM allocation**:
   - Edit AVD
   - Increase RAM to 4096 MB (if host has 16GB+)

2. **Enable GPU acceleration**:
   - Edit AVD
   - Graphics: Hardware - GLES 2.0

3. **Reduce screen resolution**:
   - Use a smaller device definition (e.g., Pixel 4 instead of Pixel 7)

4. **Close other applications**:
   - Free up system resources

5. **Use ARM64 image** (if on ARM processor):
   - Select arm64-v8a system image instead of x86_64

6. **Cold Boot instead of Quick Boot**:
   - Edit AVD > Advanced > Boot option > Cold boot

#### Issue: Emulator uses too much CPU

**Solutions**:
- Reduce multi-core CPU count in AVD settings
- Use `-no-boot-anim` flag when starting emulator
- Close Device Frame (unchecked in AVD settings)

### WSL2-Specific Issues

#### Issue: Cannot find adb or emulator commands

**Solution**: Update WSL2 paths in `~/.bashrc`:
```bash
# Replace {YourUsername} with actual username
export ANDROID_HOME="/mnt/c/Users/{YourUsername}/AppData/Local/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
export PATH="$PATH:$ANDROID_HOME/emulator"

# Reload
source ~/.bashrc
```

#### Issue: "Permission denied" when running adb.exe

**Solution**: Check Windows path is mounted correctly:
```bash
ls -la /mnt/c/Users/{YourUsername}/AppData/Local/Android/Sdk
```

If not found, verify username and path.

### Environment Variable Issues

#### Issue: Commands not found after setting environment variables

**Solutions**:
1. **Close and reopen terminal/command prompt**
2. **Restart computer** (environment changes require restart)
3. **Verify PATH** contains Android SDK directories:
   ```powershell
   echo %PATH%
   ```

## Alternative: Physical Device

If emulator performance is unsatisfactory, use a physical Android device.

### Step 1: Enable Developer Options

On your Android device:
1. Go to **Settings** > **About Phone**
2. Tap **Build Number** 7 times
3. Enter your PIN/password
4. You'll see "You are now a developer!"

### Step 2: Enable USB Debugging

1. Go to **Settings** > **Developer Options**
2. Enable **Developer Options** toggle
3. Enable **USB Debugging**

### Step 3: Connect Device

1. Connect device to computer via USB
2. On device, allow USB debugging when prompted
3. Check "Always allow from this computer"
4. Tap "OK"

### Step 4: Verify Connection

```bash
adb devices
```

Expected output:
```
List of devices attached
ABC123XYZ    device
```

### Step 5: Run Expo on Device

```bash
cd Stepper.Mobile
npm run android:device
```

## Additional Resources

- [Android Studio Official Site](https://developer.android.com/studio)
- [Android Emulator Documentation](https://developer.android.com/studio/run/emulator)
- [Expo Android Development](https://docs.expo.dev/workflow/android-studio-emulator/)
- [ADB Documentation](https://developer.android.com/studio/command-line/adb)
- [AVD Manager Guide](https://developer.android.com/studio/run/managing-avds)

## Quick Reference

### Common Commands

```bash
# List available AVDs
emulator -list-avds

# Start specific AVD
emulator -avd Stepper_Pixel7_API36

# Start with options
emulator -avd Stepper_Pixel7_API36 -gpu host -no-boot-anim

# List connected devices
adb devices

# Restart ADB
adb kill-server && adb start-server

# Install APK
adb install path/to/app.apk

# Clear app data
adb shell pm clear com.Stepper.mobile

# View logs
adb logcat
```

### Package.json Scripts

```json
{
  "android": "expo start --android",
  "android:device": "expo start --android --device"
}
```

### Environment Variables Summary

**Windows**:
- `ANDROID_HOME`: `C:\Users\{YourUsername}\AppData\Local\Android\Sdk`
- Add to PATH: `%ANDROID_HOME%\platform-tools`, `%ANDROID_HOME%\emulator`, etc.

**WSL2** (`~/.bashrc`):
```bash
export ANDROID_HOME="/mnt/c/Users/{YourUsername}/AppData/Local/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
export PATH="$PATH:$ANDROID_HOME/emulator"
```

## Support

If you encounter issues not covered in this guide:

1. Check Android Studio Event Log (bottom-right corner)
2. Check emulator logs: `adb logcat`
3. Check Expo Metro bundler output
4. Search [Stack Overflow](https://stackoverflow.com/questions/tagged/android-emulator)
5. Consult [Expo Forums](https://forums.expo.dev/)

---

**Next Steps**: After successful setup, proceed to testing the Stepper on your emulator and begin UI development.
