// src/components/layout/Footer.jsx
import Container from './Container';

export default function Footer() {
  return (
    <footer className="">
      <Container className="w-full p-4 text-center text-xs text-muted">
        <p className="text-sm">&copy; {new Date().getFullYear()} Blue Turtle. Alle rettigheder forbeholdes.</p>
      </Container>
    </footer>
  );
}