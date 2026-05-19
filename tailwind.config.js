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
        'note': '0 2px 6px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
        'note-hover': '0 4px 10px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)',
        'note-drag': '0 14px 28px rgba(0,0,0,0.22), 0 6px 10px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}
