import Link from "next/link";
import { register } from "../actions";

export default function RegisterPage() {
  return (
    <main className="auth">
      <h1>holahabitos</h1>
      <p className="auth-sub">Creá tu cuenta</p>
      <form action={register} className="auth-form">
        <input name="displayName" type="text" placeholder="Tu nombre" autoComplete="name" />
        <input name="email" type="email" placeholder="Email" autoComplete="email" required />
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          autoComplete="new-password"
          minLength={6}
          required
        />
        <button type="submit">Crear cuenta</button>
      </form>
      <p className="auth-alt">
        ¿Ya tenés cuenta? <Link href="/login">Iniciar sesión</Link>
      </p>
    </main>
  );
}
