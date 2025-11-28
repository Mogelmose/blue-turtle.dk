import Providers from "./Providers";
import localFont from "next/font/local";
import "./css/globals.css";

const votrag = localFont({
  src: "./fonts/Votrag-Bold.ttf",
  weight: "700",
  style: "normal",
  display: "swap",
  variable: "--font-votrag",
});


export default function RootLayout({ children }) {
  return (
    <html lang="da">
      <head>
        <link rel="icon" type="image/svg+xml" href="/static/favicon.svg" />
      </head>
      <body className={votrag.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
