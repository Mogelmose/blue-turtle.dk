// src/components/layout/Footer.jsx
import Container from './Container';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white">
      <Container className="py-4 flex justify-center items-center">
        <p className="text-sm">&copy; {new Date().getFullYear()} Blue Turtle. Alle rettigheder forbeholdes.</p>
      </Container>
    </footer>
  );
}