import { identity } from "@/lib/portfolio";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer shell">
      <Link className="wordmark" href="/" aria-label="Purav S — home">
        purav
      </Link>
      <p>© {new Date().getFullYear()} Purav S</p>
      <div>
        <a href={identity.github} target="_blank" rel="noopener noreferrer">
          GitHub ↗
        </a>
        <a href={identity.linkedin} target="_blank" rel="noopener noreferrer">
          LinkedIn ↗
        </a>
        <a href="#top">Back to top ↑</a>
      </div>
    </footer>
  );
}
