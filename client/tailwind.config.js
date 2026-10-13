/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: '#070709',
          900: '#0C0D12',
          850: '#12131A',
          800: '#181A24',
          700: '#232634',
          600: '#32374A',
          500: '#4B526D',
          400: '#717B9F',
          300: '#A1A9C4',
          200: '#D2D7E6',
          100: '#F0F2F8',
        },
        glass: {
          highlight: 'rgba(255, 255, 255, 0.16)',
          border: 'rgba(255, 255, 255, 0.08)',
          card: 'rgba(18, 19, 26, 0.72)',
          surface: 'rgba(12, 13, 18, 0.85)',
          glow: 'rgba(160, 175, 210, 0.15)',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Cabinet Grotesk', 'Outfit', 'sans-serif']
      },
      boxShadow: {
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.4), inset 0 1px 1px 0 rgba(255, 255, 255, 0.12)',
        'glass-md': '0 8px 32px 0 rgba(0, 0, 0, 0.5), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.15)',
        'glass-lg': '0 16px 48px -8px rgba(0, 0, 0, 0.65), inset 0 1px 2px 0 rgba(255, 255, 255, 0.2)',
        'specular': '0 0 0 1px rgba(255, 255, 255, 0.12), 0 20px 40px -15px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
        'neon-graphite': '0 0 25px -5px rgba(130, 145, 180, 0.35)',
      },
      backdropBlur: {
        'xs': '2px',
        '3xl': '48px',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'sheen': 'sheen 3s ease infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        sheen: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        }
      }
    },
  },
  plugins: [],
}
