// src/components/ui/Input.jsx
export default function Input({ 
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  className = ''
}) {
  const baseStyles = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`${baseStyles} ${className}`}
    />
  );
}