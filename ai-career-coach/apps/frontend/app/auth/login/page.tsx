// apps/web/src/app/(auth)/login/page.tsx

import AuthLayout from '../../../components/auth/AuthLayout';
import LoginForm from '../../../components/auth/LoginForm';
import PublicRoute from '../../../components/auth/PublicRoute';

export default function LoginPage() {
  return (
    <PublicRoute>
      <AuthLayout
        title="Welcome back"
        subtitle="Sign in to your account to continue"
      >
        <LoginForm />
      </AuthLayout>
    </PublicRoute>
  );
}
