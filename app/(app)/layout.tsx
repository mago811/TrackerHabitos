import Link from "next/link";
import { logout } from "@/app/(auth)/actions";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <main className="app-main">{children}</main>
      <nav className="bottom-nav">
        <Link href="/today">
          <span className="nav-ico">✓</span>
          Hoy
        </Link>
        <Link href="/reports">
          <span className="nav-ico">▤</span>
          Reportes
        </Link>
        <Link href="/habits">
          <span className="nav-ico">☰</span>
          Hábitos
        </Link>
        <form action={logout}>
          <button type="submit">
            <span className="nav-ico">⎋</span>
            Salir
          </button>
        </form>
      </nav>
    </div>
  );
}
