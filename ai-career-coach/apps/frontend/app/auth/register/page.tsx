// apps/web/src/app/(auth)/register/page.tsx

import AuthLayout from '../../../components/auth/AuthLayout';
import RegisterForm from '../../../components/auth/RegisterForm';
import PublicRoute from '../../../components/auth/PublicRoute';

export default function RegisterPage() {
  return (
    <PublicRoute>
      <AuthLayout
        title="Create your account"
        subtitle="Start your career journey with AI-powered guidance"
      >
        <RegisterForm />
      </AuthLayout>
    </PublicRoute>
  );
}
