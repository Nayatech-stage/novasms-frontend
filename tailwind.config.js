/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2EC80A',
        'on-primary': '#FFFFFF',
        secondary: '#0C5460',
        'on-secondary': '#FFFFFF',
        surface: '#FDFDFD',
        background: '#F7F9F6',
        'surface-variant': '#F0F4EF',
        'on-surface': '#0C1409',
        'on-surface-variant': '#434D40',
        outline: '#D1D9CD',
        'outline-variant': '#E1E9DD',
        error: '#DC2626',
        success: '#16A34A',
      },
      borderRadius: {
        DEFAULT: '4px',
        lg: '8px',
        xl: '12px',
        '2xl': '24px',
        full: '9999px',
      },
      fontFamily: {
        headline: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
