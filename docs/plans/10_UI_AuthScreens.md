# Plan 10: Auth Screens UI

## Summary

This plan implements the authentication screens for the Walking App including Login, Register, and Forgot Password screens. These screens handle user authentication via Supabase Auth with clean, accessible UI following Material Design 3 principles using React Native Paper components.

## Screens

### 1. Login Screen
### 2. Register Screen
### 3. Forgot Password Screen

---

## 1. Login Screen

### Screen Purpose
Allow existing users to sign in using email and password with Supabase authentication.

### ASCII Wireframe

```
┌─────────────────────────────────────┐
│  ← Back                             │
│                                     │
│         🚶 Walking App              │
│                                     │
│      Welcome Back!                  │
│      Sign in to continue            │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Email                       │   │
│  │ user@example.com            │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Password              👁     │   │
│  │ ••••••••                    │   │
│  └─────────────────────────────┘   │
│                                     │
│           Forgot Password?          │
│                                     │
│  ┌─────────────────────────────┐   │
│  │        Sign In              │   │
│  └─────────────────────────────┘   │
│                                     │
│  ─────────── OR ───────────         │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   🔵 Continue with Google   │   │
│  └─────────────────────────────┘   │
│                                     │
│    Don't have an account?           │
│           Sign Up                   │
│                                     │
└─────────────────────────────────────┘
```

### Components

**React Native Paper:**
- `TextInput` (email, password with secure text entry)
- `Button` (primary for Sign In, outlined for Google)
- `Text` (title, subtitle, links)
- `IconButton` (password visibility toggle)

**React Native Core:**
- `KeyboardAvoidingView` (for keyboard handling)
- `ScrollView` (scrollable content)
- `TouchableOpacity` (for text links)

**Custom:**
- `AuthLayout` (wrapper with logo and styling)

### Navigation

**From:**
- App launch (if not authenticated)
- Register screen (via "Already have an account?" link)

**To:**
- Main app (bottom tabs) on successful login
- Register screen (via "Sign Up" link)
- Forgot Password screen (via "Forgot Password?" link)

### API Calls

```typescript
// Supabase Auth
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
```

### State Management

**Local State (useState):**
- `email: string`
- `password: string`
- `showPassword: boolean`
- `isLoading: boolean`
- `error: string | null`

**Global State (Zustand):**
- `authStore.signIn(email, password)` - Triggers auth and updates global session

### Interactions

1. **Email Input Change**: Update local email state
2. **Password Input Change**: Update local password state
3. **Toggle Password Visibility**: Show/hide password text
4. **Forgot Password Link**: Navigate to Forgot Password screen
5. **Sign In Button Press**:
   - Validate email format
   - Validate password not empty
   - Call `authStore.signIn()`
   - Show loading spinner
   - On success: Navigate to Main app
   - On error: Display error message below button
6. **Continue with Google**: Trigger OAuth flow (future feature)
7. **Sign Up Link**: Navigate to Register screen

### Validation

- Email: Valid email format (regex)
- Password: Minimum 6 characters
- Show inline validation errors on blur

---

## 2. Register Screen

### Screen Purpose
Allow new users to create an account with email, password, and display name.

### ASCII Wireframe

```
┌─────────────────────────────────────┐
│  ← Back                             │
│                                     │
│         🚶 Walking App              │
│                                     │
│      Create Account                 │
│      Join the walking community     │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Display Name                │   │
│  │ John Doe                    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Email                       │   │
│  │ john@example.com            │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Password              👁     │   │
│  │ ••••••••                    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Confirm Password      👁     │   │
│  │ ••••••••                    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ☐ I agree to Terms & Privacy      │
│                                     │
│  ┌─────────────────────────────┐   │
│  │        Sign Up              │   │
│  └─────────────────────────────┘   │
│                                     │
│    Already have an account?         │
│           Sign In                   │
│                                     │
└─────────────────────────────────────┘
```

### Components

**React Native Paper:**
- `TextInput` (display name, email, password, confirm password)
- `Button` (primary for Sign Up)
- `Checkbox` (terms agreement)
- `Text` (labels, links)

**Custom:**
- `PasswordStrengthIndicator` (shows password strength)
- `AuthLayout`

### Navigation

**From:**
- Login screen (via "Sign Up" link)

**To:**
- Login screen (via "Sign In" link or after successful registration)
- Terms/Privacy screens (via checkbox links - future)

### API Calls

```typescript
// Supabase Auth - Sign Up
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      display_name: displayName,
    },
  },
});
```

### State Management

**Local State:**
- `displayName: string`
- `email: string`
- `password: string`
- `confirmPassword: string`
- `agreedToTerms: boolean`
- `showPassword: boolean`
- `showConfirmPassword: boolean`
- `isLoading: boolean`
- `error: string | null`

**Global State:**
- `authStore.signUp(email, password, displayName)`

### Interactions

1. **Display Name Input**: Update local state, validate length (2-50 chars)
2. **Email Input**: Update local state, validate email format
3. **Password Input**: Update local state, show strength indicator
4. **Confirm Password Input**: Validate matches password
5. **Toggle Password Visibility**: Show/hide password text
6. **Terms Checkbox**: Toggle agreement state
7. **Sign Up Button Press**:
   - Validate all fields
   - Check terms agreement
   - Call `authStore.signUp()`
   - Show loading spinner
   - On success: Show "Check your email" message, navigate to Login
   - On error: Display error (email already exists, weak password, etc.)
8. **Sign In Link**: Navigate to Login screen

### Validation

- Display Name: 2-50 characters, no special characters
- Email: Valid email format
- Password: Minimum 8 characters, must contain letter and number
- Confirm Password: Must match password
- Terms: Must be checked
- Show validation errors inline on blur

---

## 3. Forgot Password Screen

### Screen Purpose
Allow users to request a password reset link via email.

### ASCII Wireframe

```
┌─────────────────────────────────────┐
│  ← Back to Login                    │
│                                     │
│         🚶 Walking App              │
│                                     │
│      Forgot Password?               │
│      Enter your email to reset      │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Email                       │   │
│  │ user@example.com            │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   Send Reset Link           │   │
│  └─────────────────────────────┘   │
│                                     │
│                                     │
│  ℹ️  We'll send you a link to      │
│     reset your password             │
│                                     │
│                                     │
│                                     │
│           Remember it?              │
│           Sign In                   │
│                                     │
└─────────────────────────────────────┘
```

**Success State:**

```
┌─────────────────────────────────────┐
│  ← Back to Login                    │
│                                     │
│         🚶 Walking App              │
│                                     │
│      Check Your Email               │
│                                     │
│         ✉️                          │
│                                     │
│  We've sent a password reset        │
│  link to:                           │
│                                     │
│  user@example.com                   │
│                                     │
│  Click the link in the email to     │
│  reset your password                │
│                                     │
│  ┌─────────────────────────────┐   │
│  │     Back to Login           │   │
│  └─────────────────────────────┘   │
│                                     │
│    Didn't receive the email?        │
│         Resend Link                 │
│                                     │
└─────────────────────────────────────┘
```

### Components

**React Native Paper:**
- `TextInput` (email)
- `Button` (primary for Send Reset Link)
- `Text` (title, info message)
- `Surface` (success state card)

**Custom:**
- `SuccessMessage` component

### Navigation

**From:**
- Login screen (via "Forgot Password?" link)

**To:**
- Login screen (via back button or "Back to Login" button)

### API Calls

```typescript
// Supabase Auth - Password Reset
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'walkingapp://reset-password',
});
```

### State Management

**Local State:**
- `email: string`
- `isLoading: boolean`
- `emailSent: boolean`
- `error: string | null`

**No Global State needed**

### Interactions

1. **Email Input**: Update local state, validate format
2. **Send Reset Link Button Press**:
   - Validate email
   - Call Supabase password reset
   - Show loading spinner
   - On success: Show success state with sent email
   - On error: Show error message
3. **Resend Link**: Call password reset again (with rate limiting)
4. **Back to Login**: Navigate to Login screen
5. **Sign In Link**: Navigate to Login screen

### Validation

- Email: Valid email format
- Show error if email not found (or generic message for security)

---

## Implementation Details

### File Structure

```
src/screens/auth/
├── LoginScreen.tsx
├── RegisterScreen.tsx
├── ForgotPasswordScreen.tsx
├── components/
│   ├── AuthLayout.tsx
│   ├── PasswordStrengthIndicator.tsx
│   └── AuthErrorMessage.tsx
└── hooks/
    ├── useLogin.ts
    ├── useRegister.ts
    └── useForgotPassword.ts
```

### Shared Styling

```typescript
const authStyles = {
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logo: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
  },
};
```

### Custom Hooks

**useLogin.ts:**
```typescript
export const useLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signIn = useAuthStore((state) => state.signIn);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return { email, setEmail, password, setPassword, isLoading, error, handleLogin };
};
```

## Dependencies

**Required from Plan 9:**
- Supabase client configured
- authStore with signIn/signUp/signOut methods
- React Navigation (AuthNavigator)
- React Native Paper theme

## Acceptance Criteria

- [ ] Login screen allows email/password authentication
- [ ] Login shows validation errors
- [ ] Login navigates to Main app on success
- [ ] Register screen creates new account
- [ ] Register validates all fields
- [ ] Register shows password strength
- [ ] Register requires terms agreement
- [ ] Forgot Password sends reset email
- [ ] Forgot Password shows success message
- [ ] All screens are keyboard-aware
- [ ] All screens follow Material Design 3
- [ ] Navigation flows work correctly
- [ ] Error messages are user-friendly
- [ ] Loading states show spinners

## Accessibility

- All inputs have labels
- Buttons have accessible roles
- Error messages announced by screen reader
- Adequate touch targets (min 44x44)
- Support for system font scaling
- High contrast text

## Testing

**Component Tests:**
- Login form validation works
- Register form validation works
- Password visibility toggle works
- Navigation between screens works

**Integration Tests:**
- Successful login flow
- Registration with email verification
- Password reset email sent
