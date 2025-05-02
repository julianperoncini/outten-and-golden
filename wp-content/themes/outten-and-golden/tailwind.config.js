/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.js', './views/**/*.twig'],
  theme: {
    screens: {
      's': '650px',
      'm': '768px',
      'l': '1024px',
      'xl': '1280px',
      '2xl': '1440px',
      '3xl': '1920px',
      'has-hover': { raw: '(hover: hover) and (pointer: fine)' },
      'max-s': { max: '649px' },
    },
    fontFamily: {
      sans: ['sans'],
      disp: ['disp'],
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: {
        DEFAULT: '#292929',
        2: '#A4A4A4',
      },
      white: {
        DEFAULT: '#fff',
        smoke: '#F7F5F2',
      },
      grey: {
        DEFAULT: '#7A7871',
        taupe: '#DEDAD3',
      },
      green: {
        DEFAULT: '#1E383E',
        lemon: '#E5F291',
      },
      yellow: {
        DEFAULT: '#FCDC9B'
      }
    },
    // Generate fontSize scale (0-150)
    fontSize: Object.fromEntries(
      Array.from({ length: 151 }, (_, i) => [i, `${i / 10}rem`])
    ),
    // Generate spacing scale (0-50 by 1, 65-390 by 5)
    spacing: {
      ...Object.fromEntries(
        Array.from({ length: 51 }, (_, i) => [i, `${i / 10}rem`])
      ),
      ...Object.fromEntries(
        Array.from({ length: 66 }, (_, i) => [(i * 5) + 60, `${((i * 5) + 60) / 10}rem`])
      ),
    },
    // Generate z-index scale (0-10)
    zIndex: Object.fromEntries(
      Array.from({ length: 11 }, (_, i) => [i, i])
    ),
    // Generate grid column spans (0-35)
    gridColumn: Object.fromEntries(
      Array.from({ length: 36 }, (_, i) => [`span-${i}`, `span ${i} / span ${i}`])
    ),
    // Generate grid column start positions (0-35)
    gridColumnStart: Object.fromEntries(
      Array.from({ length: 36 }, (_, i) => [i, `${i}`])
    ),
    // Generate grid column end positions (0-35)
    gridColumnEnd: Object.fromEntries(
      Array.from({ length: 36 }, (_, i) => [i, `${i}`])
    ),
    transitionTimingFunction: {
      DEFAULT: 'cubic-bezier(0.23, 1, 0.32, 1)',
      'in-quad': 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
      'in-cubic': 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
      'in-quart': 'cubic-bezier(0.895, 0.03, 0.685, 0.22)',
      'in-quint': 'cubic-bezier(0.755, 0.05, 0.855, 0.06)',
      'in-sine': 'cubic-bezier(0.47, 0, 0.745, 0.715)',
      'in-expo': 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
      'in-circ': 'cubic-bezier(0.6, 0.04, 0.98, 0.335)',
      'in-back': 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
      'out-quad': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      'out-cubic': 'cubic-bezier(0.215, 0.61, 0.355, 1)',
      'out-quart': 'cubic-bezier(0.165, 0.84, 0.44, 1)',
      'out-quint': 'cubic-bezier(0.23, 1, 0.32, 1)',
      'out-sine': 'cubic-bezier(0.39, 0.575, 0.565, 1)',
      'out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
      'out-circ': 'cubic-bezier(0.075, 0.82, 0.165, 1)',
      'out-back': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      'in-out-quad': 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
      'in-out-cubic': 'cubic-bezier(0.645, 0.045, 0.355, 1)',
      'in-out-quart': 'cubic-bezier(0.77, 0, 0.175, 1)',
      'in-out-quint': 'cubic-bezier(0.86, 0, 0.07, 1)',
      'in-out-sine': 'cubic-bezier(0.445, 0.05, 0.55, 0.95)',
      'in-out-expo': 'cubic-bezier(1, 0, 0, 1)',
      'in-out-circ': 'cubic-bezier(0.785, 0.135, 0.15, 0.86)',
      'in-out-back': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
    extend: {
      height: {
        'full-screen': 'calc(var(--vh) * 100)',
        'almost-screen': 'calc((var(--vh) * 100) - 4.8rem)'
      },
      gridTemplateColumns: {
        10: 'repeat(10, minmax(0, 1fr))',
        16: 'repeat(16, minmax(0, 1fr))',
        24: 'repeat(24, minmax(0, 1fr))',
      },
      animation: {
        'spin-slow': 'spin 10s linear infinite',
      },
      gridColumn: {
				'span-full': '1 / -1',
			},
    },
  },
  experimental: {
      optimizeUniversalDefaults: true
  },
  plugins: [],
}