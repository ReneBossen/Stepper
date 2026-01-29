#!/usr/bin/env node

/**
 * Expo Project Initialization Verification Script
 *
 * This script verifies that the Expo mobile project has been correctly initialized
 * according to the requirements in the implementation plan.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const results = {
  passed: [],
  failed: [],
  warnings: [],
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function pass(message) {
  results.passed.push(message);
  log(`✓ ${message}`, colors.green);
}

function fail(message) {
  results.failed.push(message);
  log(`✗ ${message}`, colors.red);
}

function warn(message) {
  results.warnings.push(message);
  log(`⚠ ${message}`, colors.yellow);
}

function section(title) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(title, colors.cyan);
  log('='.repeat(60), colors.cyan);
}

// Verification functions

function verifyFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    pass(`${description} exists: ${path.basename(filePath)}`);
    return true;
  } else {
    fail(`${description} missing: ${filePath}`);
    return false;
  }
}

function verifyDirectoryExists(dirPath, description) {
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    pass(`${description} exists: ${path.basename(dirPath)}`);
    return true;
  } else {
    fail(`${description} missing: ${dirPath}`);
    return false;
  }
}

function verifyPackageJson() {
  section('1. Package.json Verification');

  const packagePath = path.join(__dirname, 'package.json');
  if (!verifyFileExists(packagePath, 'package.json')) return;

  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

  // Check required dependencies
  const requiredDeps = ['expo', 'react', 'react-native', 'expo-status-bar'];
  requiredDeps.forEach(dep => {
    if (pkg.dependencies && pkg.dependencies[dep]) {
      pass(`Dependency installed: ${dep}@${pkg.dependencies[dep]}`);
    } else {
      fail(`Missing dependency: ${dep}`);
    }
  });

  // Check devDependencies
  const requiredDevDeps = ['@types/react', 'typescript', 'babel-plugin-module-resolver'];
  requiredDevDeps.forEach(dep => {
    if (pkg.devDependencies && pkg.devDependencies[dep]) {
      pass(`Dev dependency installed: ${dep}@${pkg.devDependencies[dep]}`);
    } else {
      fail(`Missing dev dependency: ${dep}`);
    }
  });

  // Check scripts
  const requiredScripts = ['start', 'android', 'ios', 'web'];
  requiredScripts.forEach(script => {
    if (pkg.scripts && pkg.scripts[script]) {
      pass(`Script configured: ${script}`);
    } else {
      warn(`Missing script: ${script}`);
    }
  });
}

function verifyAppJson() {
  section('2. App.json Configuration');

  const appJsonPath = path.join(__dirname, 'app.json');
  if (!verifyFileExists(appJsonPath, 'app.json')) return;

  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

  if (appJson.expo) {
    pass('Expo configuration object exists');

    // Check required fields
    const requiredFields = ['name', 'slug', 'version', 'orientation', 'icon'];
    requiredFields.forEach(field => {
      if (appJson.expo[field]) {
        pass(`App.json has ${field}: ${appJson.expo[field]}`);
      } else {
        fail(`App.json missing ${field}`);
      }
    });

    // Check platform-specific configs
    if (appJson.expo.ios && appJson.expo.ios.bundleIdentifier) {
      pass(`iOS bundle identifier: ${appJson.expo.ios.bundleIdentifier}`);
    } else {
      warn('iOS bundle identifier not configured');
    }

    if (appJson.expo.android && appJson.expo.android.package) {
      pass(`Android package: ${appJson.expo.android.package}`);
    } else {
      warn('Android package not configured');
    }

    if (appJson.expo.scheme) {
      pass(`Deep linking scheme: ${appJson.expo.scheme}`);
    } else {
      warn('Deep linking scheme not configured');
    }
  } else {
    fail('App.json missing expo configuration object');
  }
}

function verifyTsConfig() {
  section('3. TypeScript Configuration');

  const tsConfigPath = path.join(__dirname, 'tsconfig.json');
  if (!verifyFileExists(tsConfigPath, 'tsconfig.json')) return;

  const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));

  if (tsConfig.extends === 'expo/tsconfig.base') {
    pass('Extends expo/tsconfig.base');
  } else {
    fail('Does not extend expo/tsconfig.base');
  }

  if (tsConfig.compilerOptions) {
    if (tsConfig.compilerOptions.strict) {
      pass('Strict mode enabled');
    } else {
      warn('Strict mode not enabled');
    }

    if (tsConfig.compilerOptions.paths) {
      const requiredAliases = [
        '@/*',
        '@components/*',
        '@screens/*',
        '@navigation/*',
        '@store/*',
        '@services/*',
        '@hooks/*',
        '@theme/*',
        '@types/*',
        '@utils/*',
        '@config/*'
      ];

      requiredAliases.forEach(alias => {
        if (tsConfig.compilerOptions.paths[alias]) {
          pass(`Path alias configured: ${alias}`);
        } else {
          fail(`Path alias missing: ${alias}`);
        }
      });
    } else {
      fail('No path aliases configured');
    }
  } else {
    fail('No compiler options found');
  }
}

function verifyBabelConfig() {
  section('4. Babel Configuration');

  const babelPath = path.join(__dirname, 'babel.config.js');
  if (!verifyFileExists(babelPath, 'babel.config.js')) return;

  const babelContent = fs.readFileSync(babelPath, 'utf8');

  if (babelContent.includes('babel-preset-expo')) {
    pass('Uses babel-preset-expo');
  } else {
    fail('Missing babel-preset-expo preset');
  }

  if (babelContent.includes('module-resolver')) {
    pass('Module resolver plugin configured');
  } else {
    fail('Module resolver plugin not configured');
  }

  // Check for path aliases in babel config
  const requiredAliases = [
    '@components',
    '@screens',
    '@navigation',
    '@store',
    '@services',
    '@hooks',
    '@theme',
    '@types',
    '@utils',
    '@config'
  ];

  requiredAliases.forEach(alias => {
    const cleanAlias = alias.replace('/*', '');
    if (babelContent.includes(`'${cleanAlias}'`)) {
      pass(`Babel alias configured: ${cleanAlias}`);
    } else {
      warn(`Babel alias might be missing: ${cleanAlias}`);
    }
  });
}

function verifyProjectStructure() {
  section('5. Project Structure');

  const requiredDirs = [
    'src',
    'src/components',
    'src/screens',
    'src/screens/auth',
    'src/screens/friends',
    'src/screens/groups',
    'src/screens/home',
    'src/screens/settings',
    'src/screens/steps',
    'src/navigation',
    'src/store',
    'src/services',
    'src/services/api',
    'src/hooks',
    'src/theme',
    'src/types',
    'src/utils',
    'src/config',
    'assets'
  ];

  requiredDirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    verifyDirectoryExists(dirPath, `Directory ${dir}`);
  });
}

function verifyEnvironmentConfig() {
  section('6. Environment Configuration');

  const envExamplePath = path.join(__dirname, '.env.example');
  if (!verifyFileExists(envExamplePath, '.env.example')) return;

  const envContent = fs.readFileSync(envExamplePath, 'utf8');

  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'API_BASE_URL',
    'APP_ENV'
  ];

  requiredVars.forEach(varName => {
    if (envContent.includes(varName)) {
      pass(`Environment variable placeholder: ${varName}`);
    } else {
      fail(`Missing environment variable: ${varName}`);
    }
  });

  // Check that actual .env is gitignored
  const gitignorePath = path.join(__dirname, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (gitignoreContent.includes('.env') && !gitignoreContent.includes('!.env.example')) {
      pass('.env files are gitignored');
    } else {
      fail('.env files not properly gitignored');
    }
  }
}

function verifyGitignore() {
  section('7. Gitignore Verification');

  const gitignorePath = path.join(__dirname, '.gitignore');
  if (!verifyFileExists(gitignorePath, '.gitignore')) return;

  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');

  const requiredEntries = [
    'node_modules/',
    '.expo/',
    '.env',
    '.env*.local',
    '/ios',
    '/android',
    'dist/',
    'web-build/'
  ];

  requiredEntries.forEach(entry => {
    if (gitignoreContent.includes(entry)) {
      pass(`Gitignore entry: ${entry}`);
    } else {
      fail(`Missing gitignore entry: ${entry}`);
    }
  });
}

function verifyAppTsx() {
  section('8. App.tsx Verification');

  const appPath = path.join(__dirname, 'App.tsx');
  if (!verifyFileExists(appPath, 'App.tsx')) return;

  const appContent = fs.readFileSync(appPath, 'utf8');

  if (appContent.includes('export default function App()')) {
    pass('App component exports correctly');
  } else {
    fail('App component not properly exported');
  }

  if (appContent.includes('react-native')) {
    pass('Imports from react-native');
  } else {
    fail('Missing react-native imports');
  }

  if (appContent.includes('expo-status-bar')) {
    pass('Imports StatusBar from expo-status-bar');
  } else {
    warn('StatusBar not imported from expo-status-bar');
  }
}

function printSummary() {
  section('Verification Summary');

  log(`\nTotal checks run: ${results.passed.length + results.failed.length + results.warnings.length}`, colors.blue);
  log(`Passed: ${results.passed.length}`, colors.green);
  log(`Failed: ${results.failed.length}`, colors.red);
  log(`Warnings: ${results.warnings.length}`, colors.yellow);

  if (results.failed.length > 0) {
    log('\n❌ Project initialization verification FAILED', colors.red);
    log('\nFailed checks:', colors.red);
    results.failed.forEach(msg => log(`  - ${msg}`, colors.red));
    process.exit(1);
  } else if (results.warnings.length > 0) {
    log('\n⚠ Project initialization verification PASSED with warnings', colors.yellow);
    log('\nWarnings:', colors.yellow);
    results.warnings.forEach(msg => log(`  - ${msg}`, colors.yellow));
    process.exit(0);
  } else {
    log('\n✅ All verification checks PASSED!', colors.green);
    process.exit(0);
  }
}

// Run all verifications
function main() {
  log('\n' + '='.repeat(60), colors.cyan);
  log('EXPO PROJECT INITIALIZATION VERIFICATION', colors.cyan);
  log('='.repeat(60) + '\n', colors.cyan);

  verifyPackageJson();
  verifyAppJson();
  verifyTsConfig();
  verifyBabelConfig();
  verifyProjectStructure();
  verifyEnvironmentConfig();
  verifyGitignore();
  verifyAppTsx();

  printSummary();
}

main();
