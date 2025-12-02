// src/components/ui/Badge.jsx
export default function Badge({ children, className = '' }) {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800';
  
  return (
    <span className={`${baseStyles} ${className}`}>
      {children}
    </span>
  );
}