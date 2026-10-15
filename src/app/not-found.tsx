import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="shell not-found">
      <span className="eyebrow">404 / NOT HERE</span>
      <h1>
        A little
        <br />
        <em>off course.</em>
      </h1>
      <p>This page isn’t available. There’s plenty to explore back home.</p>
      <Link href="/" className="button button-light">
        Back to the portfolio ↗
      </Link>
    </main>
  );
}
