import Header from "@/components/layout/Header";
import { Globe } from "lucide-react";

export default function GeomapPage() {
  return (
    <div className="page-container">
      <Header />
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 72,
              height: 72,
              borderRadius: "9999px",
              backgroundColor: "#0e72b9",
              color: "white",
              boxShadow: "0 10px 25px rgba(14,114,185,0.35)",
              marginBottom: 16,
            }}
            aria-hidden
          >
            <Globe size={34} strokeWidth={1.75} />
          </div>
          <h1 style={{ fontSize: 32, marginBottom: 8 }}>Geomap</h1>
          <p style={{ color: "#666" }}>
            Placeholder for the geomap page. We’ll add real content later.
          </p>
        </div>
      </main>
      <footer>
        <p>© 2025 Blue Turtle. Alle rettigheder forbeholdes.</p>
      </footer>
    </div>
  );
}
