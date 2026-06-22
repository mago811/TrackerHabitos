import Link from "next/link";
import { login } from "../actions";

export default function LoginPage() {
  return (
    <main className="auth">
      <h1>holahabitos</h1>
      <p className="auth-sub">Iniciá sesión para seguir tus hábitos</p>
      <form action={login} className="auth-form">
        <input name="email" type="email" placeholder="Email" autoComplete="email" required />
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          autoComplete="current-password"
          required
        />
        <button type="submit">Entrar</button>
      </form>
      <p className="auth-alt">
        ¿No tenés cuenta? <Link href="/register">Crear cuenta</Link>
      </p>
    </main>
  );
}
