/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E40AF',
          dark: '#1E3A8A',
          light: '#3B82F6',
          bg: '#EFF6FF',
        },
        success: '#16A34A',
        warning: '#D97706',
        error: '#DC2626',
        text: {
          dark: '#1E293B',
          gray: '#64748B',
        },
        border: '#BFDBFE',
      },
    },
  },
  plugins: [],
}
