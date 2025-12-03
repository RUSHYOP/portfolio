"use client";

interface NavbarProps {
  visible: boolean;
  scrollTo: (id: string) => void;
}

export default function Navbar({ visible, scrollTo }: NavbarProps) {
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
          <li>
            <a
              href="#about"
              className="nav-link"
              tabIndex={visible ? 0 : -1}
              onClick={(e) => {
                e.preventDefault();
                scrollTo("about");
              }}
            >
              About
            </a>
          </li>
          <li>
            <a
              href="#projects"
              className="nav-link"
              tabIndex={visible ? 0 : -1}
              onClick={(e) => {
                e.preventDefault();
                scrollTo("projects");
              }}
            >
              Projects
            </a>
          </li>
          <li>
            <a
              href="#contact"
              className="nav-link"
              tabIndex={visible ? 0 : -1}
              onClick={(e) => {
                e.preventDefault();
                scrollTo("contact");
              }}
            >
              Contact
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
