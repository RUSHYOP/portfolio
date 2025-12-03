"use client";

interface NavbarProps {
  visible: boolean;
  scrollTo: (id: string) => void;
}

export default function Navbar({ visible, scrollTo }: NavbarProps) {
  return (
    <nav className={`navbar ${visible ? "visible" : ""}`}>
      <div className="nav-container">
        <a href="#" className="logo">
          PURAV S
        </a>
        <ul className="nav-menu">
          <li>
            <a
              href="#about"
              className="nav-link"
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
