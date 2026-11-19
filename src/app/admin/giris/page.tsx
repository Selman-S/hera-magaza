import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Yönetim girişi", robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="flex items-baseline gap-2">
          <span className="font-serif text-3xl">Hera</span>
          <span className="kicker">Yönetim</span>
        </p>
        <h1 className="mt-8 mb-6 font-serif text-2xl font-light">Giriş yapın</h1>
        <LoginForm />
      </div>
    </main>
  );
}
