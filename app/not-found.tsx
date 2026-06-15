import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell loading-shell">
      <div className="loading-card">
        <p className="eyebrow">404</p>
        <h1>Такой страницы нет</h1>
        <Link className="button" href="/">
          Вернуться к туру
        </Link>
      </div>
    </main>
  );
}
