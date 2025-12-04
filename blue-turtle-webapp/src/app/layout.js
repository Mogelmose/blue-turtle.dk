import Providers from "./Providers";

export default function RootLayout({ children }) {
  return (
    <html lang="da">
      <head>
        <link rel="icon" type="image/svg+xml" href="/static/favicon.svg" />
      </head>
      <body className="bg-light-background text-light-text dark:bg-dark-background dark:text-dark-text transition-colors duration-300">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
