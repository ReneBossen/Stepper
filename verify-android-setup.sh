#!/bin/bash

# Android Development Environment Verification Script
# Checks Android SDK, ADB, Emulator, and AVD setup
# Compatible with WSL2 accessing Windows Android installations

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track overall success
ALL_CHECKS_PASSED=true

print_header() {
    echo -e "${BLUE}=== Android Development Environment Verification ===${NC}\n"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
    ALL_CHECKS_PASSED=false
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

check_android_home() {
    echo -e "\n${BLUE}Checking ANDROID_HOME...${NC}"

    if [ -z "$ANDROID_HOME" ]; then
        print_error "ANDROID_HOME environment variable is not set"
        print_info "Please set ANDROID_HOME in your ~/.bashrc or ~/.zshrc:"
        echo "  export ANDROID_HOME=\"/mnt/c/Users/{YourUsername}/AppData/Local/Android/Sdk\""
        return 1
    fi

    print_success "ANDROID_HOME is set"
    echo "    Path: $ANDROID_HOME"
    return 0
}

check_sdk_directory() {
    echo -e "\n${BLUE}Checking Android SDK directory...${NC}"

    if [ -z "$ANDROID_HOME" ]; then
        print_error "Cannot check SDK directory - ANDROID_HOME not set"
        return 1
    fi

    if [ ! -d "$ANDROID_HOME" ]; then
        print_error "Android SDK directory does not exist: $ANDROID_HOME"
        print_info "Please verify Android Studio installation and ANDROID_HOME path"
        return 1
    fi

    print_success "Android SDK directory exists"

    # Check for key subdirectories
    local key_dirs=("platform-tools" "emulator")
    local missing_dirs=()

    for dir in "${key_dirs[@]}"; do
        if [ ! -d "$ANDROID_HOME/$dir" ]; then
            missing_dirs+=("$dir")
        fi
    done

    if [ ${#missing_dirs[@]} -gt 0 ]; then
        print_warning "Some SDK directories are missing: ${missing_dirs[*]}"
        print_info "Install missing components via Android Studio SDK Manager"
    else
        print_info "Key SDK directories found"
    fi

    return 0
}

check_adb() {
    echo -e "\n${BLUE}Checking ADB (Android Debug Bridge)...${NC}"

    # Try to find adb (works with both direct and .exe versions)
    if command -v adb >/dev/null 2>&1; then
        print_success "ADB is available"

        # Get version
        local adb_version=$(adb version 2>&1 | head -n 1)
        echo "    Version: $adb_version"

        # Check if ADB server is running
        local adb_server_status=$(adb get-state 2>&1 || echo "not running")
        if [[ "$adb_server_status" != "not running" ]]; then
            print_info "ADB server is running"
        fi

        return 0
    elif command -v adb.exe >/dev/null 2>&1; then
        print_success "ADB is available (adb.exe)"

        local adb_version=$(adb.exe version 2>&1 | head -n 1)
        echo "    Version: $adb_version"
        return 0
    else
        print_error "ADB is not available in PATH"
        print_info "Add \$ANDROID_HOME/platform-tools to your PATH"
        return 1
    fi
}

check_emulator() {
    echo -e "\n${BLUE}Checking Android Emulator...${NC}"

    if command -v emulator >/dev/null 2>&1; then
        print_success "Emulator is available"

        # Get version (suppress stderr as emulator -version can be verbose)
        local emulator_version=$(emulator -version 2>/dev/null | head -n 1 || echo "Version unavailable")
        echo "    Version: $emulator_version"
        return 0
    elif command -v emulator.exe >/dev/null 2>&1; then
        print_success "Emulator is available (emulator.exe)"

        local emulator_version=$(emulator.exe -version 2>/dev/null | head -n 1 || echo "Version unavailable")
        echo "    Version: $emulator_version"
        return 0
    else
        print_error "Emulator is not available in PATH"
        print_info "Add \$ANDROID_HOME/emulator to your PATH"
        return 1
    fi
}

check_avds() {
    echo -e "\n${BLUE}Checking Android Virtual Devices (AVDs)...${NC}"

    # Determine which emulator command to use
    local emulator_cmd=""
    if command -v emulator >/dev/null 2>&1; then
        emulator_cmd="emulator"
    elif command -v emulator.exe >/dev/null 2>&1; then
        emulator_cmd="emulator.exe"
    else
        print_error "Cannot check AVDs - emulator command not found"
        return 1
    fi

    # List AVDs
    local avd_list=$($emulator_cmd -list-avds 2>/dev/null)

    if [ -z "$avd_list" ]; then
        print_warning "No AVDs found"
        print_info "Create an AVD using Android Studio Device Manager"
        print_info "Recommended: Stepper_Pixel7_API34"
        return 1
    fi

    print_success "Available AVDs found:"
    while IFS= read -r avd; do
        echo "    - $avd"
    done <<< "$avd_list"

    # Check for recommended AVD
    if echo "$avd_list" | grep -q "Stepper_Pixel7_API34"; then
        print_info "Recommended AVD 'Stepper_Pixel7_API34' is configured"
    else
        print_warning "Recommended AVD 'Stepper_Pixel7_API34' not found"
        print_info "Consider creating it for Walking App development"
    fi

    return 0
}

check_connected_devices() {
    echo -e "\n${BLUE}Checking connected devices/emulators...${NC}"

    # Determine which adb command to use
    local adb_cmd=""
    if command -v adb >/dev/null 2>&1; then
        adb_cmd="adb"
    elif command -v adb.exe >/dev/null 2>&1; then
        adb_cmd="adb.exe"
    else
        print_warning "Cannot check devices - adb command not found"
        return 1
    fi

    # Get device list
    local device_list=$($adb_cmd devices 2>/dev/null | tail -n +2 | grep -v "^$")

    if [ -z "$device_list" ]; then
        print_info "No devices or emulators currently connected"
        print_info "Start an emulator or connect a physical device to test"
        return 0
    fi

    print_success "Connected devices:"
    while IFS= read -r device; do
        echo "    $device"
    done <<< "$device_list"

    return 0
}

check_sdk_platforms() {
    echo -e "\n${BLUE}Checking installed SDK platforms...${NC}"

    if [ -z "$ANDROID_HOME" ]; then
        print_warning "Cannot check platforms - ANDROID_HOME not set"
        return 1
    fi

    local platforms_dir="$ANDROID_HOME/platforms"

    if [ ! -d "$platforms_dir" ]; then
        print_warning "Platforms directory not found"
        return 1
    fi

    # List installed platforms
    local platforms=$(ls -1 "$platforms_dir" 2>/dev/null || echo "")

    if [ -z "$platforms" ]; then
        print_warning "No SDK platforms installed"
        print_info "Install Android SDK platforms via Android Studio SDK Manager"
        print_info "Recommended: Android API 34 (UpsideDownCake)"
        return 1
    fi

    print_success "Installed SDK platforms:"
    echo "$platforms" | while read -r platform; do
        echo "    - $platform"
    done

    # Check for recommended API level
    if echo "$platforms" | grep -q "android-34"; then
        print_info "Recommended API 34 is installed"
    else
        print_warning "Recommended API 34 not found"
        print_info "Install Android 14 (API 34) via SDK Manager"
    fi

    return 0
}

test_emulator_dry_run() {
    echo -e "\n${BLUE}Testing emulator launch capability (dry-run)...${NC}"

    # Determine which emulator command to use
    local emulator_cmd=""
    if command -v emulator >/dev/null 2>&1; then
        emulator_cmd="emulator"
    elif command -v emulator.exe >/dev/null 2>&1; then
        emulator_cmd="emulator.exe"
    else
        print_warning "Cannot test emulator - command not found"
        return 1
    fi

    # Get first AVD
    local first_avd=$($emulator_cmd -list-avds 2>/dev/null | head -n 1)

    if [ -z "$first_avd" ]; then
        print_warning "Cannot test - no AVDs available"
        return 1
    fi

    # Test if emulator can be invoked (use -help to avoid actually starting)
    if $emulator_cmd -help >/dev/null 2>&1; then
        print_success "Emulator can be launched"
        print_info "Test launch: emulator -avd $first_avd"
    else
        print_error "Emulator command failed"
        return 1
    fi

    return 0
}

print_summary() {
    echo -e "\n${BLUE}=== Summary ===${NC}\n"

    if [ "$ALL_CHECKS_PASSED" = true ]; then
        print_success "All checks passed!"
        echo ""
        echo "Your Android development environment is ready."
        echo ""
        echo "Next steps:"
        echo "  1. Start an emulator: emulator -avd Stepper_Pixel7_API34"
        echo "  2. Navigate to mobile project: cd Stepper.Mobile"
        echo "  3. Run Expo: npm run android"
        echo ""
    else
        print_error "Some checks failed"
        echo ""
        echo "Please review the errors above and:"
        echo "  1. Follow the suggestions provided"
        echo "  2. Refer to docs/ANDROID_EMULATOR_SETUP.md for detailed setup instructions"
        echo "  3. Re-run this script after making corrections"
        echo ""
        exit 1
    fi
}

# Main execution
main() {
    print_header

    check_android_home
    check_sdk_directory
    check_adb
    check_emulator
    check_sdk_platforms
    check_avds
    check_connected_devices
    test_emulator_dry_run

    print_summary
}

# Run main function
main
