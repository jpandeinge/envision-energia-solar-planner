import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "Envision Energia — Solar planning for Namibia";
const description =
  "Draw your installation area, size a solar system and compare traceable supplier offers in Namibia.";

export async function generateMetadata(): Promise<Metadata> {
  const incomingHeaders = await headers();
  const host =
    incomingHeaders.get("x-forwarded-host") ??
    incomingHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    incomingHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const siteUrl = `${protocol}://${host}`;
  const socialImage = `${siteUrl}/og.png?v=20260816-map`;
  const socialImageAlt =
    "Envision Energia rooftop solar planner with a traced Namibian property and fitted solar panels";

  return {
    title,
    description,
    alternates: { canonical: siteUrl },
    openGraph: {
      title,
      description,
      type: "website",
      url: siteUrl,
      siteName: "Envision Energia",
      locale: "en_NA",
      images: [{ url: socialImage, width: 1730, height: 909, alt: socialImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: socialImage, alt: socialImageAlt }],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#f5f4ec",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
