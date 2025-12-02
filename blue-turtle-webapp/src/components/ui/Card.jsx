// src/components/ui/Card.jsx
export default function Card({ children, className = '' }) {
  const baseStyles = 'bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow';
  
  return (
    <div className={`${baseStyles} ${className}`}>
      {children}
    </div>
  );
}