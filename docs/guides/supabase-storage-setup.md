# Supabase Storage Setup Guide

This guide explains how to configure Supabase Storage for user avatar uploads in the Stepper.

## Overview

The Stepper uses Supabase Storage to store user profile photos (avatars). This guide will walk you through creating the storage bucket and configuring security policies.

## Prerequisites

- Access to Supabase Dashboard (https://app.supabase.com)
- Your Stepper project open in Supabase

## Step 1: Create the Avatars Bucket

1. **Navigate to Storage**
   - Log in to your Supabase Dashboard
   - Select your Stepper project
   - Click on "Storage" in the left sidebar

2. **Create New Bucket**
   - Click "Create a new bucket" or the "+ New Bucket" button
   - Enter the following details:
     - **Name**: `avatars`
     - **Public bucket**: ✅ Check this box (avatars should be publicly accessible)
   - Click "Create bucket"

## Step 2: Configure Storage Policies

By default, the bucket will have no access policies. You need to add Row-Level Security (RLS) policies to control who can upload, update, and delete avatars.

### Policy 1: Users can upload their own avatar

```sql
-- Policy name: Users can upload their own avatar
-- Allowed operation: INSERT
-- Policy definition:
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

This policy allows authenticated users to upload files only to their own folder (based on their user ID).

### Policy 2: Users can update their own avatar

```sql
-- Policy name: Users can update their own avatar
-- Allowed operation: UPDATE
-- Policy definition:
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

This policy allows users to update (replace) their existing avatar files.

### Policy 3: Users can delete their own avatar

```sql
-- Policy name: Users can delete their own avatar
-- Allowed operation: DELETE
-- Policy definition:
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

This policy allows users to delete their own avatar files.

### Policy 4: Anyone can view avatars

```sql
-- Policy name: Anyone can view avatars
-- Allowed operation: SELECT
-- Policy definition:
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

This policy allows public read access to all avatars (since we marked the bucket as public).

## Step 3: Apply Policies via SQL Editor

1. **Navigate to SQL Editor**
   - In your Supabase Dashboard, click on "SQL Editor" in the left sidebar

2. **Create a New Query**
   - Click "+ New query"

3. **Copy and Paste All Policies**
   - Copy all four SQL policies from above
   - Paste them into the query editor

4. **Execute the Query**
   - Click "Run" to execute the policies
   - Verify that all policies were created successfully

## Step 4: Verify Bucket Configuration

1. **Check Bucket Settings**
   - Go back to Storage → Avatars
   - Click on the bucket settings (gear icon)
   - Verify:
     - ✅ Public bucket is enabled
     - File size limit: Default (or set to 5MB for avatars)
     - Allowed MIME types: Default (or restrict to image/* only)

2. **Test Upload** (Optional)
   - Use the Supabase dashboard to manually upload a test image
   - Verify you can access it via the public URL

## File Naming Convention

The mobile app uses the following naming convention for avatar uploads:

```
avatars/{user_id}/avatar-{timestamp}.jpg
```

Example:
```
avatars/a1b2c3d4-e5f6-7890-abcd-ef1234567890/avatar-1705555555000.jpg
```

This structure ensures:
- Each user has their own folder (based on user ID)
- File names are unique (using timestamps)
- RLS policies can easily verify ownership

## Frontend Integration

The mobile app's `usersApi.uploadAvatar()` function handles:
1. Converting the image URI to a blob
2. Generating a unique filename
3. Uploading to `avatars/{userId}/avatar-{timestamp}.jpg`
4. Retrieving the public URL
5. Updating the user profile with the avatar URL

## Security Considerations

1. **File Size Limits**: Consider setting a maximum file size (e.g., 5MB) to prevent abuse
2. **MIME Type Restrictions**: Restrict uploads to image types only (image/jpeg, image/png, image/webp)
3. **Rate Limiting**: Consider implementing rate limiting on avatar uploads (e.g., max 5 uploads per hour per user)
4. **Image Processing**: Consider using Supabase Edge Functions or a third-party service to:
   - Resize images to a standard size (e.g., 512x512)
   - Compress images to reduce storage costs
   - Remove EXIF metadata for privacy

## Troubleshooting

### Issue: "new row violates row-level security policy"

**Solution**: Ensure the storage policies are correctly applied. Run the SQL policies again from Step 3.

### Issue: "Permission denied" when uploading

**Solution**:
- Verify the user is authenticated
- Check that the bucket name in the code matches exactly: `avatars`
- Ensure the user is uploading to their own folder: `avatars/{user_id}/...`

### Issue: Avatar not displaying in the app

**Solution**:
- Verify the bucket is marked as "Public"
- Check that the public URL is correctly formatted
- Test the URL directly in a browser

## Related Files

- **Frontend API**: `Stepper.Mobile/src/services/api/usersApi.ts` (uploadAvatar function)
- **User Store**: `Stepper.Mobile/src/store/userStore.ts` (avatar upload logic)
- **Profile Setup**: `Stepper.Mobile/src/screens/onboarding/ProfileSetupScreen.tsx`

## Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage RLS Policies](https://supabase.com/docs/guides/storage/security/access-control)
- [Image Transformation (Pro Plan)](https://supabase.com/docs/guides/storage/image-transformations)
