/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f7f4",
          100: "#dceee1",
          500: "#2f7a4f",
          600: "#256440",
          700: "#1d4f33",
        },
      },
    },
  },
  plugins: [],
};
