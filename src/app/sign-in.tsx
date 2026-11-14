import { AuthForm } from '@/features/auth/AuthForm';
import { useAuth } from '@/features/auth/AuthProvider';

export default function SignInScreen() {
  const { signIn } = useAuth();

  return (
    <AuthForm
      title="Welcome back"
      subtitle="Sign in to log weigh-ins and track your trend."
      submitLabel="Sign in"
      passwordAutoComplete="current-password"
      onSubmit={signIn}
      footerText="New to Mat Log?"
      footerLinkLabel="Create an account"
      footerHref="/sign-up"
      secondaryLink={{ label: 'Forgot password?', href: '/forgot-password' }}
    />
  );
}
