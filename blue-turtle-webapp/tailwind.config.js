/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
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
        // Grayscale palette
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
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
        text: {
          DEFAULT: '#000000',
          dark: '#ffffff',
          secondary: {
            light: '#4b5563',
            dark: '#cccccc',
          },
          tertiary: {
            dark: '#aaaaaa',
          }
        }
      },
      
      spacing: {
        '0': '0rem',      //0px
        '1': '0.25rem',   //4px
        '2': '0.5rem',    //8px
        '3': '0.75rem',   //12px
        '4': '1rem',      // 16px
        '5': '1.25rem',   // 20px
        '6': '1.5rem',    // 24px
        '8': '2rem',      // 32px
        '10': '2.5rem',   // 40px
        '12': '3rem',     // 48px
        '14': '3.5rem',   // 56px
        '16': '4rem',     // 64px
        '18': '4.5rem',   // 72px
        '20': '5rem',     // 80px
        '22': '5.5rem',   // 88px
        '24': '6rem',     // 96px
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
      
      // Custom font weights
      fontWeight: {
        normal: '400',
        medium: '600',
        bold: '700',
      },
      
      // Custom line heights
      lineHeight: {
        tight: '1',
        snug: '1.2',
        normal: '1.5',
        relaxed: '1.75',
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