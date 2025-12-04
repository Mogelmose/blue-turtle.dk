/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', 
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          // Core brand colors
          50: 'hsl(195, 100%, 95%)',   // lightest - light-cyan
          100: 'hsl(195, 77%, 88%)',   // frosted-blue
          200: 'hsl(192, 84%, 78%)',   // sky-aqua
          300: 'hsl(192, 100%, 67%)',  // turquoise-surf
          400: 'hsl(191, 100%, 56%)',  // blue-green
          500: 'hsl(195, 100%, 46%)',  // bright-teal-blue (primary)
          600: 'hsl(199, 97%, 37%)',   // french-blue
          700: 'hsl(217, 91%, 27%)',   // deep-twilight
          800: 'hsl(217, 91%, 22%)',   // darker variant
          900: 'hsl(217, 91%, 17%)',   // darkest variant
        },
        
        // Light mode semantic colors
        light: {
          background: 'hsl(0, 0%, 100%)',
          surface: 'hsl(195, 100%, 95%)',        // ocean-50
          'surface-elevated': 'hsl(0, 0%, 98%)',
          border: 'hsl(195, 77%, 88%)',          // ocean-100
          text: 'hsl(217, 91%, 17%)',            // ocean-900
          'text-muted': 'hsl(217, 91%, 27%)',    // ocean-700
          primary: 'hsl(195, 100%, 46%)',        // ocean-500
          'primary-hover': 'hsl(199, 97%, 37%)', // ocean-600
        },
        
        // Dark mode semantic colors
        dark: {
          background: 'hsl(217, 91%, 12%)',
          surface: 'hsl(217, 91%, 17%)',         // ocean-900
          'surface-elevated': 'hsl(217, 91%, 22%)', // ocean-800
          border: 'hsl(217, 91%, 27%)',          // ocean-700
          text: 'hsl(195, 100%, 95%)',           // ocean-50
          'text-muted': 'hsl(195, 77%, 88%)',    // ocean-100
          primary: 'hsl(192, 100%, 67%)',        // ocean-300
          'primary-hover': 'hsl(192, 84%, 78%)', // ocean-200
        },
      },
      fontSize: {
        'xs': '0.75rem',      // 12px - captions
        'sm': '0.875rem',     // 14px - small text
        'base': '1rem',       // 16px - body text
        'lg': '1.125rem',     // 18px - large body
        'xl': '1.25rem',      // 20px - subheadings
        '2xl': '1.5rem',      // 24px - headings
        '3xl': '1.875rem',    // 30px - page titles
        '4xl': '2.25rem',     // 36px - hero text
      }
    },
  },
  plugins: [],
}