/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta tomada directo de informes/look-and-feel.md — no la cambies
        // sin actualizar ese archivo también.
        bg: '#111317',
        panel: '#1C1F26',
        border: '#2D323C',
        text: '#FFFFFF',
        muted: '#A1A7B3',
        accent: {
          green: '#A6F684',
          purple: {
            light: '#BB95FD',
            DEFAULT: '#985EFD',
          },
        },
        danger: '#FF6B6B',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
}
