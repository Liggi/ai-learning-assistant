/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "text-shimmer": {
          from: {
            "background-position": "0 0"
          },
          to: {
            "background-position": "-200% 0"
          }
        },
        "glow-pulse": {
          "0%, 100%": {
            opacity: 0.9,
            transform: "scale(1)",
            filter: "brightness(1.2) blur(0px)"
          },
          "60%": {
            opacity: 0.6,
            transform: "scale(0.98)",
            filter: "brightness(1) blur(3px)"
          }
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(56,189,248,0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(56,189,248,0.4)' },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "text-shimmer": "text-shimmer 2.5s ease-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        glow: 'glow 2s ease-in-out infinite',
      },
      typography: {
        DEFAULT: {
          css: {
            color: 'hsl(var(--foreground))',
            maxWidth: 'none',
            code: {
              backgroundColor: 'rgb(30 41 59 / 0.5)',
              padding: '0.2em 0.4em',
              borderRadius: '0.25rem',
              fontWeight: '400',
            },
            'code::before': {
              content: 'none'
            },
            'code::after': {
              content: 'none'
            },
            'blockquote p:first-of-type::before': { content: 'none' },
            'blockquote p:last-of-type::after': { content: 'none' },
          }
        }
      }
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("tailwindcss-animate"),
  ],
}
