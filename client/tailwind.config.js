/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        silver: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        chrome: {
          flare: '#ffffff',
          sheen: '#e2e8f0',
          metal: '#cbd5e1',
          steel: '#94a3b8',
          titanium: '#475569',
          graphite: '#1e293b',
          obsidian: '#0a0d14',
        },
        graphite: {
          950: '#06070a',
          900: '#0a0d14',
          850: '#0f131c',
          800: '#151926',
          700: '#202638',
          600: '#2e374d',
          500: '#475473',
          400: '#6d7d9f',
          300: '#9cb0cc',
          200: '#d1dced',
          100: '#f0f4fa',
        },
        glass: {
          highlight: 'rgba(255, 255, 255, 0.22)',
          border: 'rgba(226, 232, 240, 0.16)',
          card: 'rgba(15, 19, 28, 0.78)',
          surface: 'rgba(10, 13, 20, 0.88)',
          glow: 'rgba(203, 213, 225, 0.18)',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Space Grotesk', 'sans-serif'],
        display: ['Syne', 'Space Grotesk', 'sans-serif'],
        heading: ['Space Grotesk', 'sans-serif'],
        mono: ['Space Mono', 'monospace']
      },
      boxShadow: {
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.45), inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)',
        'glass-md': '0 8px 32px 0 rgba(0, 0, 0, 0.55), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.25)',
        'glass-lg': '0 16px 48px -8px rgba(0, 0, 0, 0.75), inset 0 1px 2px 0 rgba(255, 255, 255, 0.3)',
        'specular': '0 0 0 1px rgba(226, 232, 240, 0.22), 0 20px 40px -15px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
        'chrome': '0 0 20px rgba(226, 232, 240, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.4)',
        'neon-graphite': '0 0 30px -4px rgba(203, 213, 225, 0.25)',
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
