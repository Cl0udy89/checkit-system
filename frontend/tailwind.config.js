/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#020804",
                surface: "#080f08",
                "surface-light": "#0f1f0f",
                primary: "#00ff41",
                secondary: "#39ff14",
                accent: "#ccff00",
                "dim": "#1a2e1a",
                "muted": "#2a4a2a",
            },
            fontFamily: {
                mono: ['"JetBrains Mono"', '"Courier New"', 'monospace'],
                sans: ['"JetBrains Mono"', 'monospace'],
            },
            boxShadow: {
                'crt': '0 0 8px rgba(0,255,65,0.4), inset 0 0 8px rgba(0,255,65,0.03)',
                'crt-lg': '0 0 20px rgba(0,255,65,0.3), 0 0 40px rgba(0,255,65,0.1)',
                'crt-input': '0 0 6px rgba(0,255,65,0.5)',
            },
            animation: {
                'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'blink': 'blink 1s step-end infinite',
                'flicker': 'flicker 8s infinite',
                'scanline': 'scanline 8s linear infinite',
            },
            keyframes: {
                blink: {
                    '0%, 50%': { opacity: '1' },
                    '51%, 100%': { opacity: '0' },
                },
                flicker: {
                    '0%, 100%': { opacity: '1' },
                    '92%': { opacity: '1' },
                    '93%': { opacity: '0.8' },
                    '94%': { opacity: '1' },
                    '96%': { opacity: '0.9' },
                    '97%': { opacity: '1' },
                },
                scanline: {
                    '0%': { transform: 'translateY(-100%)' },
                    '100%': { transform: 'translateY(100vh)' },
                },
            },
        },
    },
    plugins: [],
}
