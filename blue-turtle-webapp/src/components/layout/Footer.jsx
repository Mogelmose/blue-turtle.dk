// src/components/layout/Footer.jsx
import Container from './Container';

export default function Footer() {
  return (
    <footer className="bg-light-surface dark:bg-dark-surface border-t border-light-border dark:border-dark-border">
      <Container className="py-4 flex justify-center items-center">
        <p className="text-sm">&copy; {new Date().getFullYear()} Blue Turtle. Alle rettigheder forbeholdes.</p>
      </Container>
    </footer>
  );
}