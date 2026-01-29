/**
 * Seed Test Data Script
 *
 * This script generates comprehensive test data for the Stepper using the Supabase Admin API.
 * It creates test users, groups, group memberships, friendships, and step entries.
 *
 * Usage:
 *   npx ts-node scripts/seed-test-data.ts [--cleanup]
 *
 * Environment Variables Required:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key (with admin privileges)
 *
 * Options:
 *   --cleanup  Delete all test data before seeding
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Missing required environment variables.');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test email domain for identifying test users
const TEST_EMAIL_DOMAIN = 'testuser.stepper.local';

// ============================================================================
// Test Data Definitions
// ============================================================================

interface TestUser {
  email: string;
  password: string;
  display_name: string;
  avatar_url: string | null;
}

interface TestGroup {
  name: string;
  description: string;
  is_public: boolean;
  period_type: 'daily' | 'weekly' | 'monthly';
  join_code: string | null;
}

interface CreatedUser extends TestUser {
  id: string;
}

interface CreatedGroup extends TestGroup {
  id: string;
  created_by_id: string;
}

const TEST_USERS: TestUser[] = [
  {
    email: `alice@${TEST_EMAIL_DOMAIN}`,
    password: 'TestPassword123!',
    display_name: 'Alice Walker',
    avatar_url: null,
  },
  {
    email: `bob@${TEST_EMAIL_DOMAIN}`,
    password: 'TestPassword123!',
    display_name: 'Bob Runner',
    avatar_url: null,
  },
  {
    email: `carol@${TEST_EMAIL_DOMAIN}`,
    password: 'TestPassword123!',
    display_name: 'Carol Strider',
    avatar_url: null,
  },
  {
    email: `dave@${TEST_EMAIL_DOMAIN}`,
    password: 'TestPassword123!',
    display_name: 'Dave Pacer',
    avatar_url: null,
  },
  {
    email: `emma@${TEST_EMAIL_DOMAIN}`,
    password: 'TestPassword123!',
    display_name: 'Emma Steps',
    avatar_url: null,
  },
  {
    email: `frank@${TEST_EMAIL_DOMAIN}`,
    password: 'TestPassword123!',
    display_name: 'Frank Marathon',
    avatar_url: null,
  },
  {
    email: `grace@${TEST_EMAIL_DOMAIN}`,
    password: 'TestPassword123!',
    display_name: 'Grace Hiker',
    avatar_url: null,
  },
  {
    email: `henry@${TEST_EMAIL_DOMAIN}`,
    password: 'TestPassword123!',
    display_name: 'Henry Trails',
    avatar_url: null,
  },
  {
    email: `ivy@${TEST_EMAIL_DOMAIN}`,
    password: 'TestPassword123!',
    display_name: 'Ivy Jogger',
    avatar_url: null,
  },
  {
    email: `jack@${TEST_EMAIL_DOMAIN}`,
    password: 'TestPassword123!',
    display_name: 'Jack Sprint',
    avatar_url: null,
  },
];

const TEST_GROUPS: TestGroup[] = [
  {
    name: 'Morning Walkers Club',
    description: 'A group for early bird walkers who love to start their day with a walk.',
    is_public: true,
    period_type: 'weekly',
    join_code: null,
  },
  {
    name: 'Office Step Challenge',
    description: 'Compete with your coworkers to see who walks the most each day.',
    is_public: false,
    period_type: 'daily',
    join_code: 'OFFICE2026',
  },
  {
    name: 'Monthly Marathon',
    description: 'Track your monthly steps and aim for marathon distances!',
    is_public: true,
    period_type: 'monthly',
    join_code: null,
  },
  {
    name: 'Weekend Warriors',
    description: 'A private group for serious weekend hikers.',
    is_public: false,
    period_type: 'weekly',
    join_code: 'WEEKEND1',
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates a random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random step count (realistic daily range)
 */
function generateStepCount(): number {
  // Most people walk between 3,000 and 15,000 steps per day
  // Add some variance for interesting leaderboards
  const baseSteps = randomInt(3000, 15000);
  // Occasionally add bonus steps for variety
  const bonus = Math.random() > 0.8 ? randomInt(0, 3000) : 0;
  return baseSteps + bonus;
}

/**
 * Calculates distance in meters from step count
 * Average stride length is approximately 0.762 meters (30 inches)
 */
function calculateDistance(steps: number): number {
  const strideLength = 0.762;
  return Math.round(steps * strideLength * 100) / 100;
}

/**
 * Generates a random QR code ID
 */
function generateQrCodeId(): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Gets dates for the past N days
 */
function getPastDates(days: number): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date);
  }
  return dates;
}

/**
 * Formats a date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Delays execution for the specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Cleanup Functions
// ============================================================================

async function cleanupTestData(): Promise<void> {
  console.log('Cleaning up test data...');

  // Get all test user IDs from auth
  const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError.message);
    return;
  }

  const testUserIds = authUsers.users
    .filter((user) => user.email?.endsWith(`@${TEST_EMAIL_DOMAIN}`))
    .map((user) => user.id);

  if (testUserIds.length === 0) {
    console.log('No test users found to clean up.');
    return;
  }

  console.log(`Found ${testUserIds.length} test users to clean up.`);

  // Delete step entries for test users
  const { error: stepError } = await supabase
    .from('step_entries')
    .delete()
    .in('user_id', testUserIds);
  if (stepError) {
    console.error('Error deleting step entries:', stepError.message);
  } else {
    console.log('  - Step entries deleted');
  }

  // Delete friendships involving test users
  const { error: friendError1 } = await supabase
    .from('friendships')
    .delete()
    .in('requester_id', testUserIds);
  if (friendError1) {
    console.error('Error deleting friendships (requester):', friendError1.message);
  }

  const { error: friendError2 } = await supabase
    .from('friendships')
    .delete()
    .in('addressee_id', testUserIds);
  if (friendError2) {
    console.error('Error deleting friendships (addressee):', friendError2.message);
  } else {
    console.log('  - Friendships deleted');
  }

  // Delete group memberships for test users
  const { error: memberError } = await supabase
    .from('group_memberships')
    .delete()
    .in('user_id', testUserIds);
  if (memberError) {
    console.error('Error deleting group memberships:', memberError.message);
  } else {
    console.log('  - Group memberships deleted');
  }

  // Delete groups created by test users
  const { error: groupError } = await supabase
    .from('groups')
    .delete()
    .in('created_by_id', testUserIds);
  if (groupError) {
    console.error('Error deleting groups:', groupError.message);
  } else {
    console.log('  - Groups deleted');
  }

  // Delete invite codes for test users
  const { error: inviteError } = await supabase
    .from('invite_codes')
    .delete()
    .in('user_id', testUserIds);
  if (inviteError) {
    console.error('Error deleting invite codes:', inviteError.message);
  } else {
    console.log('  - Invite codes deleted');
  }

  // Delete user profiles
  const { error: profileError } = await supabase
    .from('users')
    .delete()
    .in('id', testUserIds);
  if (profileError) {
    console.error('Error deleting user profiles:', profileError.message);
  } else {
    console.log('  - User profiles deleted');
  }

  // Delete auth users
  for (const userId of testUserIds) {
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error(`Error deleting auth user ${userId}:`, deleteError.message);
    }
  }
  console.log('  - Auth users deleted');

  console.log('Cleanup complete!');
}

// ============================================================================
// Seed Functions
// ============================================================================

async function createTestUsers(): Promise<CreatedUser[]> {
  console.log('Creating test users...');
  const createdUsers: CreatedUser[] = [];

  for (const user of TEST_USERS) {
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find((u) => u.email === user.email);

    if (existingUser) {
      console.log(`  - User ${user.display_name} already exists, skipping...`);
      createdUsers.push({ ...user, id: existingUser.id });
      continue;
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
    });

    if (authError) {
      console.error(`  - Error creating auth user ${user.email}:`, authError.message);
      continue;
    }

    const userId = authData.user.id;

    // Create user profile
    const { error: profileError } = await supabase.from('users').insert({
      id: userId,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      qr_code_id: generateQrCodeId(),
      onboarding_completed: true,
      preferences: {},
    });

    if (profileError) {
      console.error(`  - Error creating profile for ${user.display_name}:`, profileError.message);
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(userId);
      continue;
    }

    createdUsers.push({ ...user, id: userId });
    console.log(`  - Created user: ${user.display_name}`);

    // Small delay to avoid rate limiting
    await delay(100);
  }

  console.log(`Created ${createdUsers.length} test users.`);
  return createdUsers;
}

async function createGroups(users: CreatedUser[]): Promise<CreatedGroup[]> {
  console.log('Creating groups...');
  const createdGroups: CreatedGroup[] = [];

  // Assign different users as group creators
  const creators = [users[0], users[2], users[4], users[6]];

  for (let i = 0; i < TEST_GROUPS.length; i++) {
    const group = TEST_GROUPS[i];
    const creator = creators[i % creators.length];

    // Check if group already exists
    const { data: existingGroup } = await supabase
      .from('groups')
      .select('id')
      .eq('name', group.name)
      .single();

    if (existingGroup) {
      console.log(`  - Group "${group.name}" already exists, skipping...`);
      createdGroups.push({ ...group, id: existingGroup.id, created_by_id: creator.id });
      continue;
    }

    const { data, error } = await supabase
      .from('groups')
      .insert({
        name: group.name,
        description: group.description,
        is_public: group.is_public,
        period_type: group.period_type,
        join_code: group.join_code,
        created_by_id: creator.id,
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  - Error creating group "${group.name}":`, error.message);
      continue;
    }

    // Create owner membership
    const { error: memberError } = await supabase.from('group_memberships').insert({
      group_id: data.id,
      user_id: creator.id,
      role: 'owner',
    });

    if (memberError) {
      console.error(`  - Error creating owner membership for "${group.name}":`, memberError.message);
    }

    createdGroups.push({ ...group, id: data.id, created_by_id: creator.id });
    console.log(`  - Created group: ${group.name} (owner: ${creator.display_name})`);
  }

  console.log(`Created ${createdGroups.length} groups.`);
  return createdGroups;
}

async function createGroupMemberships(users: CreatedUser[], groups: CreatedGroup[]): Promise<void> {
  console.log('Creating group memberships...');
  let membershipCount = 0;

  // Define membership distribution
  // Each user joins 1-3 groups with varied roles
  const membershipPlan: { userIndex: number; groupIndex: number; role: 'admin' | 'member' }[] = [
    // Morning Walkers Club (public) - popular, many members
    { userIndex: 1, groupIndex: 0, role: 'admin' },
    { userIndex: 3, groupIndex: 0, role: 'member' },
    { userIndex: 5, groupIndex: 0, role: 'member' },
    { userIndex: 7, groupIndex: 0, role: 'member' },
    { userIndex: 9, groupIndex: 0, role: 'member' },

    // Office Step Challenge (private) - fewer members
    { userIndex: 1, groupIndex: 1, role: 'member' },
    { userIndex: 3, groupIndex: 1, role: 'admin' },
    { userIndex: 5, groupIndex: 1, role: 'member' },

    // Monthly Marathon (public) - medium membership
    { userIndex: 0, groupIndex: 2, role: 'member' },
    { userIndex: 2, groupIndex: 2, role: 'member' },
    { userIndex: 6, groupIndex: 2, role: 'admin' },
    { userIndex: 8, groupIndex: 2, role: 'member' },

    // Weekend Warriors (private) - exclusive
    { userIndex: 1, groupIndex: 3, role: 'admin' },
    { userIndex: 5, groupIndex: 3, role: 'member' },
    { userIndex: 9, groupIndex: 3, role: 'member' },
  ];

  for (const membership of membershipPlan) {
    const user = users[membership.userIndex];
    const group = groups[membership.groupIndex];

    if (!user || !group) continue;

    // Skip if this user is the owner
    if (group.created_by_id === user.id) continue;

    // Check if membership already exists
    const { data: existing } = await supabase
      .from('group_memberships')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      console.log(`  - Membership for ${user.display_name} in "${group.name}" already exists`);
      continue;
    }

    const { error } = await supabase.from('group_memberships').insert({
      group_id: group.id,
      user_id: user.id,
      role: membership.role,
    });

    if (error) {
      console.error(`  - Error creating membership:`, error.message);
      continue;
    }

    membershipCount++;
    console.log(`  - ${user.display_name} joined "${group.name}" as ${membership.role}`);
  }

  console.log(`Created ${membershipCount} group memberships.`);
}

async function createFriendships(users: CreatedUser[]): Promise<void> {
  console.log('Creating friendships...');
  let friendshipCount = 0;

  // Define friendship pairs (requester_index, addressee_index, status)
  const friendshipPlan: { requester: number; addressee: number; status: 'accepted' | 'pending' }[] = [
    // Accepted friendships - creating a social network
    { requester: 0, addressee: 1, status: 'accepted' },
    { requester: 0, addressee: 2, status: 'accepted' },
    { requester: 0, addressee: 3, status: 'accepted' },
    { requester: 1, addressee: 2, status: 'accepted' },
    { requester: 1, addressee: 4, status: 'accepted' },
    { requester: 2, addressee: 3, status: 'accepted' },
    { requester: 2, addressee: 5, status: 'accepted' },
    { requester: 3, addressee: 4, status: 'accepted' },
    { requester: 3, addressee: 6, status: 'accepted' },
    { requester: 4, addressee: 5, status: 'accepted' },
    { requester: 5, addressee: 6, status: 'accepted' },
    { requester: 5, addressee: 7, status: 'accepted' },
    { requester: 6, addressee: 7, status: 'accepted' },
    { requester: 7, addressee: 8, status: 'accepted' },
    { requester: 8, addressee: 9, status: 'accepted' },

    // Pending friendships - for testing pending requests UI
    { requester: 4, addressee: 0, status: 'pending' },
    { requester: 6, addressee: 1, status: 'pending' },
    { requester: 8, addressee: 2, status: 'pending' },
    { requester: 9, addressee: 3, status: 'pending' },
    { requester: 7, addressee: 4, status: 'pending' },
  ];

  for (const friendship of friendshipPlan) {
    const requester = users[friendship.requester];
    const addressee = users[friendship.addressee];

    if (!requester || !addressee) continue;

    // Check if friendship already exists
    const { data: existing } = await supabase
      .from('friendships')
      .select('id')
      .or(
        `and(requester_id.eq.${requester.id},addressee_id.eq.${addressee.id}),and(requester_id.eq.${addressee.id},addressee_id.eq.${requester.id})`
      )
      .single();

    if (existing) {
      console.log(
        `  - Friendship between ${requester.display_name} and ${addressee.display_name} already exists`
      );
      continue;
    }

    const { error } = await supabase.from('friendships').insert({
      requester_id: requester.id,
      addressee_id: addressee.id,
      status: friendship.status,
      accepted_at: friendship.status === 'accepted' ? new Date().toISOString() : null,
    });

    if (error) {
      console.error(`  - Error creating friendship:`, error.message);
      continue;
    }

    friendshipCount++;
    const statusLabel = friendship.status === 'accepted' ? 'friends with' : 'sent request to';
    console.log(`  - ${requester.display_name} ${statusLabel} ${addressee.display_name}`);
  }

  console.log(`Created ${friendshipCount} friendships.`);
}

async function createStepEntries(users: CreatedUser[]): Promise<void> {
  console.log('Creating step entries...');
  let entryCount = 0;

  // Generate 7-14 days of step data for each user
  for (const user of users) {
    const daysOfData = randomInt(7, 14);
    const dates = getPastDates(daysOfData);
    const stepEntries: {
      user_id: string;
      step_count: number;
      distance_meters: number;
      date: string;
      source: string;
    }[] = [];

    for (const date of dates) {
      // Skip some days randomly to make data more realistic
      if (Math.random() < 0.1) continue;

      const stepCount = generateStepCount();
      const distance = calculateDistance(stepCount);

      stepEntries.push({
        user_id: user.id,
        step_count: stepCount,
        distance_meters: distance,
        date: formatDate(date),
        source: 'seed_script',
      });
    }

    if (stepEntries.length === 0) continue;

    // Insert in batches
    const { error } = await supabase.from('step_entries').upsert(stepEntries, {
      onConflict: 'user_id,date,source',
    });

    if (error) {
      console.error(`  - Error creating step entries for ${user.display_name}:`, error.message);
      continue;
    }

    entryCount += stepEntries.length;
    console.log(`  - Created ${stepEntries.length} step entries for ${user.display_name}`);
  }

  console.log(`Created ${entryCount} total step entries.`);
}

// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const shouldCleanup = args.includes('--cleanup');

  console.log('========================================');
  console.log('  Stepper Test Data Seed Script');
  console.log('========================================');
  console.log('');

  if (shouldCleanup) {
    await cleanupTestData();
    console.log('');
  }

  try {
    // Create test users
    const users = await createTestUsers();
    if (users.length === 0) {
      console.error('No users were created. Aborting.');
      process.exit(1);
    }
    console.log('');

    // Create groups
    const groups = await createGroups(users);
    console.log('');

    // Create group memberships
    await createGroupMemberships(users, groups);
    console.log('');

    // Create friendships
    await createFriendships(users);
    console.log('');

    // Create step entries
    await createStepEntries(users);
    console.log('');

    console.log('========================================');
    console.log('  Seed Complete!');
    console.log('========================================');
    console.log('');
    console.log('Summary:');
    console.log(`  - ${users.length} test users created`);
    console.log(`  - ${groups.length} groups created`);
    console.log(`  - Group memberships configured`);
    console.log(`  - Friendships established`);
    console.log(`  - Step entries generated for 7-14 days`);
    console.log('');
    console.log('Test User Credentials:');
    console.log('  Email format: {name}@testuser.stepper.local');
    console.log('  Password: TestPassword123!');
    console.log('');
    console.log('Example logins:');
    console.log(`  - alice@${TEST_EMAIL_DOMAIN}`);
    console.log(`  - bob@${TEST_EMAIL_DOMAIN}`);
    console.log('');
  } catch (error) {
    console.error('Fatal error during seeding:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
