import { LoginForm } from "@/components/auth/login-form";

interface LoginPageProps {
  onLogin: (credentials: { email: string; password: string }) => void;
}

export default function Login({ onLogin }: LoginPageProps) {
  return <LoginForm onLogin={onLogin} />;
}