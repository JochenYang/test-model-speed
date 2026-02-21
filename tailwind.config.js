/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-in-from-bottom-full": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "slide-out-to-top-full": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(-100%)" },
        },
        "slide-in-from-top-full": {
          from: { transform: "translateY(-100%)" },
          to: { transform: "translateY(0)" },
        },
        "slide-out-to-right-full": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(100%)" },
        },
        "zoom-in": {
          from: { transform: "translate(-50%, -50%) scale(0.95)" },
          to: { transform: "translate(-50%, -50%) scale(1)" },
        },
        "zoom-out": {
          from: { transform: "translate(-50%, -50%) scale(1)" },
          to: { transform: "translate(-50%, -50%) scale(0.95)" },
        },
        "slide-in-from-left-1/2": {
          from: { transform: "translateX(-50%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-in-from-top-48p": {
          from: { transform: "translateY(-48%)" },
          to: { transform: "translateY(0)" },
        },
        "slide-out-to-left-1/2": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "slide-out-to-top-48p": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(-48%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.2s ease-out",
        "slide-in-from-bottom-full": "slide-in-from-bottom-full 0.3s ease-out",
        "slide-out-to-top-full": "slide-out-to-top-full 0.3s ease-out",
        "slide-in-from-top-full": "slide-in-from-top-full 0.3s ease-out",
        "slide-out-to-right-full": "slide-out-to-right-full 0.3s ease-out",
        "zoom-in": "zoom-in 0.2s ease-out",
        "zoom-out": "zoom-out 0.2s ease-out",
        "slide-in-from-left-1/2": "slide-in-from-left-1/2 0.2s ease-out",
        "slide-in-from-top-48p": "slide-in-from-top-48p 0.2s ease-out",
        "slide-out-to-left-1/2": "slide-out-to-left-1/2 0.2s ease-out",
        "slide-out-to-top-48p": "slide-out-to-top-48p 0.2s ease-out",
      },
    },
  },
  plugins: [],
}
