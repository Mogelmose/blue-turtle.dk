import Providers from "./Providers";
import { Inter, Nunito } from "next/font/google";
import "./css/globals.css";
import "./css/design-system.css";

// Primary UI/body font
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

// Headings/display font
const nunito = Nunito({
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700"],
  variable: "--font-nunito",
});

export default function RootLayout({ children }) {
  return (
    <html lang="da" suppressHydrationWarning={true}>
      <head>
        {/* Initialize theme early to avoid flashes */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
  try {
    const stored = localStorage.getItem('theme');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const theme = stored || (prefersLight ? 'light' : 'dark');
    const root = document.documentElement;
    root.classList.remove('light','dark');
    root.classList.add(theme);
  } catch (e) {}
})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${nunito.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
