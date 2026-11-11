import { Cairo, El_Messiri, IBM_Plex_Sans_Arabic, Tajawal } from "next/font/google";
import "./globals.css";

const messiri = El_Messiri({
  subsets: ["arabic", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-messiri",
});

const plex = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-cairo",
});

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-tajawal",
});

export const metadata = {
  title: {
    default: "ناديني",
    template: "%s — ناديني",
  },
  description: "جهاز النداء الرقمي للمطاعم.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={`${messiri.variable} ${plex.variable} ${cairo.variable} ${tajawal.variable}`}>
      <body className="bg-ivory font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
