import { registerRootComponent } from 'expo';

// Import background task early to ensure it's defined at module load time.
// This is required for background tasks to work correctly.
import './src/services/stepTracking/backgroundSyncTask';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
