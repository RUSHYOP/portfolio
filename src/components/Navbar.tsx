"use client";

interface NavLink {
  label: string;
  href: string;
}

interface NavbarProps {
  visible: boolean;
  showNavbar: boolean;
  scrollTo: (id: string) => void;
  navLinks: NavLink[];
}

export default function Navbar({ visible, showNavbar, scrollTo, navLinks }: NavbarProps) {
  if (!showNavbar) return null;

  return (
    <nav 
      className={`navbar ${visible ? "visible" : ""}`}
      aria-hidden={!visible}
      inert={!visible ? true : undefined}
    >
      <div className="nav-container">
        <a href="#main-content" className="logo" tabIndex={visible ? 0 : -1}>
          PURAV S
        </a>
        <ul className="nav-menu" role="list">
          {navLinks.map((link) => (
            <li key={link.label}>
              {link.href.startsWith("#") ? (
                <a
                  href={link.href}
                  className="nav-link"
                  tabIndex={visible ? 0 : -1}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollTo(link.href.replace("#", ""));
                  }}
                >
                  {link.label}
                </a>
              ) : (
                <a
                  href={link.href}
                  className="nav-link"
                  tabIndex={visible ? 0 : -1}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                >
                  {link.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
