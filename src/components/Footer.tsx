import Link from "next/link";

interface FooterSection {
  title: string;
  links: { label: string; url: string }[];
}

interface FooterProps {
  footerSections: FooterSection[];
}

export default function Footer({ footerSections }: FooterProps) {
  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-content">
        <div className="footer-sections">
          {footerSections.map((section) => (
            <div className="footer-section" key={section.title}>
              <h4 className="footer-section-title">{section.title}</h4>
              <ul className="footer-section-links">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.url.startsWith("/") ? (
                      <Link href={link.url} className="footer-link">
                        {link.label}
                      </Link>
                    ) : link.url.startsWith("#") ? (
                      <a href={link.url} className="footer-link">
                        {link.label}
                      </a>
                    ) : (
                      <a
                        href={link.url}
                        className="footer-link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
