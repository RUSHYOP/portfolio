import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const styrene = localFont({
  src: [
    { path: "../../public/fonts/StyreneA-Regular.otf", weight: "400" },
    { path: "../../public/fonts/StyreneA-Medium.otf", weight: "500" },
  ],
  variable: "--font-styrene",
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://rushy.dev",
  ),
  title: {
    default: "Purav S — Thoughtful code. Useful software.",
    template: "%s — Purav S",
  },
  description:
    "Software developer in Bangalore building thoughtful web applications, backend systems, and machine learning projects. Explore selected work and get in touch.",
  openGraph: {
    type: "website",
    title: "Purav S — Software developer",
    description:
      "Thoughtful code. Useful software. Selected projects in web development, backend systems and machine learning.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={styrene.variable}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
        {process.env.VERCEL && <Analytics />}
      </body>
    </html>
  );
}
