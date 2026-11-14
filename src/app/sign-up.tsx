import { router } from 'expo-router';

import { AuthForm } from '@/features/auth/AuthForm';
import { useAuth } from '@/features/auth/AuthProvider';

export default function SignUpScreen() {
  const { signUp } = useAuth();

  return (
    <AuthForm
      title="Create your account"
      subtitle="Track your weight through the season."
      submitLabel="Sign up"
      passwordAutoComplete="new-password"
      onSubmit={async (email, password) => {
        const { needsEmailConfirmation } = await signUp(email, password);
        if (needsEmailConfirmation) {
          router.push({ pathname: '/confirm-email', params: { email } });
        }
      }}
      footerText="Already have an account?"
      footerLinkLabel="Sign in"
      footerHref="/sign-in"
    />
  );
}
