import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}'
  ],
  theme: {
    fontFamily: {
      sans: ['Inter', 'sans-serif']
    },
    extend: {
      colors: {
        ink: {
          950: '#0B0F1A',
          900: '#11162A',
          800: '#1A2140',
          700: '#2A335A',
          600: 'rgba(255,255,255,0.65)',
          500: 'rgba(255,255,255,0.4)',
          300: 'rgba(255,255,255,0.18)',
          200: 'rgba(255,255,255,0.12)',
          100: 'rgba(255,255,255,0.08)'
        },
        accent: {
          500: '#5A67D8',
          400: '#6B7CFF'
        },
        primary: '#5A67D8',
        mint: {
          500: '#10B981'
        },
        amber: {
          500: '#F59E0B'
        },
        rose: {
          500: '#F43F5E'
        }
      },
      boxShadow: {
        soft: '0 20px 60px rgba(11, 15, 26, 0.45)',
        node: '0 24px 50px rgba(11, 15, 26, 0.55)'
      },
      backgroundImage: {
        'zercon-gradient':
          'radial-gradient(1200px 600px at 10% -10%, rgba(90,103,216,0.25), transparent 60%), radial-gradient(800px 400px at 90% 10%, rgba(88,80,236,0.18), transparent 55%), linear-gradient(180deg, #0B0F1A 0%, #11162A 60%, #0B0F1A 100%)'
      }
    }
  },
  plugins: []
};

export default config;
