import "./globals.css";
import Providers from "./Providers";

export default function RootLayout({ children }) {
  return (
    <html lang="da">
      <head>
        <link rel="icon" type="image/svg+xml" href="/static/favicon.svg" />
      </head>
      <body className="bg-page text-main">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
