import Providers from "./Providers";
import "./css/globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="da">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
