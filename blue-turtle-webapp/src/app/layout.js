import Providers from "./Providers";
import "./css/globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="da">
      <head>
        <link rel="icon" type="image/svg+xml" href="/static/favicon.svg" />
      </head>
      <body className={"bg-gray-100"}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
