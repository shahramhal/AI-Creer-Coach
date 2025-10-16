// apps/web/src/app/(auth)/login/page.tsx

import AuthLayout from '../../../components/auth/AuthLayout';
import LoginForm from '../../../components/auth/LoginForm';

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account to continue"
    >
      <LoginForm />
    </AuthLayout>
  );
}