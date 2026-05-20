/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sticky: {
          yellow: '#FEF3A2',
          pink: '#FFCFE3',
          blue: '#C7E6FF',
          green: '#CFF3D2',
        },
      },
      boxShadow: {
        'note': '0 3px 6px rgba(60, 35, 15, 0.22), 0 1px 2px rgba(60, 35, 15, 0.18)',
        'note-hover': '0 6px 14px rgba(60, 35, 15, 0.3), 0 2px 4px rgba(60, 35, 15, 0.2)',
        'note-drag': '0 18px 32px rgba(60, 35, 15, 0.42), 0 8px 14px rgba(60, 35, 15, 0.25)',
      },
    },
  },
  plugins: [],
}
