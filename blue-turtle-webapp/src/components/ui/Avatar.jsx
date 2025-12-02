// src/components/ui/Avatar.jsx
import Image from 'next/image';

export default function Avatar({ src, alt, size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const baseStyles = 'rounded-full object-cover';

  return (
    <div className={`relative ${sizes[size]} ${className}`}>
      <Image
        src={src}
        alt={alt}
        layout="fill"
        className={baseStyles}
      />
    </div>
  );
}