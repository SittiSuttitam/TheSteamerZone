/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"Segoe UI"',
          'sans-serif',
        ],
      },
      colors: {
        tsz: {
          bg: '#F5F5F7',
          surface: '#FFFFFF',
          text: '#1D1D1F',
          muted: '#6E6E73',
          border: 'rgba(0,0,0,0.08)',
          accent: '#0071E3',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        lg: '12px',
        xl: '20px',
      },
    },
  },
  plugins: [],
};
