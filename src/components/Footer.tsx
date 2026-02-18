import Link from "next/link";

interface FooterProps {
  githubUrl: string;
  linkedinUrl: string;
  xUrl: string;
  instagramUrl: string;
  resumeUrl: string;
}

export default function Footer({ githubUrl, linkedinUrl, xUrl, instagramUrl, resumeUrl }: FooterProps) {
  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-content">
        <nav className="footer-links" aria-label="Social links">
          <Link href="/projects" className="footer-link" aria-label="Projects page">
            Projects
          </Link>
          <a
            href={githubUrl}
            className="footer-link"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub profile"
          >
            GitHub
          </a>
          <a
            href={linkedinUrl}
            className="footer-link"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn profile"
          >
            LinkedIn
          </a>
          <a
            href={xUrl}
            className="footer-link"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X profile"
          >
            X
          </a>
          <a
            href={instagramUrl}
            className="footer-link"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram profile"
          >
            Instagram
          </a>
          <a
            href={resumeUrl}
            className="footer-link"
            download="purav-s-resume.pdf"
            aria-label="Download resume"
          >
            Resume
          </a>
        </nav>
        <p>&copy; 2025 Purav S</p>
      </div>
    </footer>
  );
}
