/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    // Add any other paths where you use Tailwind classes
  ],
  theme: {
    extend: {
      // Your custom color palette
      colors: {
        primary: {
          50: '#e6f2fb',
          100: '#b3daf5',
          200: '#80c1ef',
          300: '#4da9e9',
          400: '#2691d9',
          500: '#0e72b9', // Main brand color
          600: '#0a5598',
          700: '#083d70',
          800: '#052648',
          900: '#031320',
        },
        secondary: {
          400: '#007bff',
          500: '#0056b3',
          600: '#004085',
        },
        info: {
          400: '#0099dd',
          500: '#007acc',
          600: '#005a99',
        },
        dark: {
          base: '#000000',
          surface: '#111111',
          elevated: '#1e1e1e',
          'elevated-hover': '#2c2c2c',
          border: '#2e2e2e',
          input: '#333333',
          hover: '#444444',
          'border-light': '#555555',
        },
        success: {
          DEFAULT: '#4dff4d',
          dark: '#22c55e',
        },
        error: {
          DEFAULT: '#ff4d4d',
          dark: '#ef4444',
        },
        warning: {
          DEFAULT: '#ffa500',
          dark: '#f59e0b',
        },
      },
      
      // Custom spacing (matches your design system)
      spacing: {
        '18': '4.5rem',   // 72px
        '22': '5.5rem',   // 88px
        '26': '6.5rem',   // 104px
      },
      
      // Custom font sizes
      fontSize: {
        'xs': '12px',
        'sm': '14px',
        'base': '16px',
        'md': '17px',
        'lg': '18px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '28px',
        '4xl': '35px',
        '5xl': '48px',
        '6xl': '64px',
      },
      
      // Custom font families
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
        heading: ['Nunito', 'sans-serif'],
      },
      
      // Custom border radius
      borderRadius: {
        'sm': '5px',
        'md': '8px',
        'lg': '10px',
        'xl': '12px',
      },
      
      // Custom box shadows
      boxShadow: {
        'xs': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'sm': '0 2px 5px rgba(0, 0, 0, 0.1)',
        'md': '0 4px 10px rgba(0, 0, 0, 0.15)',
        'lg': '0 5px 15px rgba(0, 0, 0, 0.3)',
        'xl': '0 10px 25px rgba(0, 0, 0, 0.4)',
        '2xl': '0 20px 50px rgba(0, 0, 0, 0.5)',
      },
      
      // Custom transitions
      transitionDuration: {
        'fast': '150ms',
        'base': '200ms',
        'slow': '300ms',
        'slower': '500ms',
      },
      
      // Custom z-index
      zIndex: {
        'dropdown': '100',
        'sticky': '200',
        'fixed': '300',
        'modal-backdrop': '1000',
        'modal': '1001',
        'tooltip': '1100',
      },
      
      // Custom max widths
      maxWidth: {
        'container': '1920px',
        'content': '1400px',
        'text': '1200px',
        'form': '500px',
        'narrow': '400px',
      },
      
      // Custom heights
      height: {
        'header': '60px',
        'header-lg': '80px',
        'footer': '40px',
      },
      
      // Letter spacing
      letterSpacing: {
        'wide': '0.025em',
        'wider': '0.05em',
        'widest': '0.1em',
      },
    },
  },
  plugins: [],
};