/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
    	extend: {
    		colors: {
    			border: 'hsl(var(--border))',
    			input: 'hsl(var(--input))',
    			ring: 'hsl(var(--ring))',
    			background: 'hsl(var(--background))',
    			foreground: 'hsl(var(--foreground))',
    			primary: {
    				DEFAULT: 'hsl(var(--primary))',
    				foreground: 'hsl(var(--primary-foreground))'
    			},
    			secondary: {
    				DEFAULT: 'hsl(var(--secondary))',
    				foreground: 'hsl(var(--secondary-foreground))'
    			},
    			destructive: {
    				DEFAULT: 'hsl(var(--destructive))',
    				foreground: 'hsl(var(--destructive-foreground))'
    			},
    			muted: {
    				DEFAULT: 'hsl(var(--muted))',
    				foreground: 'hsl(var(--muted-foreground))'
    			},
    			accent: {
    				DEFAULT: 'hsl(var(--accent))',
    				foreground: 'hsl(var(--accent-foreground))'
    			},
    			popover: {
    				DEFAULT: 'hsl(var(--popover))',
    				foreground: 'hsl(var(--popover-foreground))'
    			},
    			card: {
    				DEFAULT: 'hsl(var(--card))',
    				foreground: 'hsl(var(--card-foreground))'
    			},
    			teal: {
    				50: '#f0fdfa',
    				100: '#ccfbf1',
    				200: '#99f6e4',
    				300: '#5eead4',
    				400: '#2dd4bf',
    				500: '#14b8a6',
    				600: '#0d9488',
    				700: '#0f766e',
    				800: '#115e59',
    				900: '#134e4a',
    			},
    			coral: {
    				50: '#fff7ed',
    				100: '#ffedd5',
    				200: '#fed7aa',
    				300: '#fdba74',
    				400: '#fb923c',
    				500: '#f97316',
    				600: '#ea580c',
    				700: '#c2410c',
    			},
    			chart: {
    				'1': 'hsl(var(--chart-1))',
    				'2': 'hsl(var(--chart-2))',
    				'3': 'hsl(var(--chart-3))',
    				'4': 'hsl(var(--chart-4))',
    				'5': 'hsl(var(--chart-5))'
    			}
    		},
    		fontFamily: {
    			sans: ['Inter', 'sans-serif'],
    			heading: ['Manrope', 'sans-serif'],
    			mono: ['JetBrains Mono', 'monospace'],
    		},
    		borderRadius: {
    			lg: 'var(--radius)',
    			md: 'calc(var(--radius) - 2px)',
    			sm: 'calc(var(--radius) - 4px)'
    		},
    		boxShadow: {
    			'card': '0 2px 8px rgba(15, 23, 42, 0.04)',
    			'card-hover': '0 12px 24px rgba(15, 23, 42, 0.08)',
    			'dropdown': '0 10px 40px rgba(15, 23, 42, 0.12)',
    		},
    	}
    },
    plugins: [require("tailwindcss-animate")],
};
