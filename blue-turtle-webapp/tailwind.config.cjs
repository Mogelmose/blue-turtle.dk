/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'deep-twilight': '#03045E',
        'french-blue': '#023E8A',
        'bright-teal-blue': '#0077B6',
        'blue-green': '#0096C7',
        'turquoise-surf': '#00B4D8',
        'sky-aqua': '#48CAE4',
        'frosted-blue': '#90E0EF',
        'light-cyan': '#CAF0F8',
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