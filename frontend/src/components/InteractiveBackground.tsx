import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

export default function InteractiveBackground() {
    const { pathname } = useLocation()
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const mousePosRef = useRef({ x: 50, y: 50 })
    const blobsRef = useRef<HTMLDivElement>(null)
    const glowRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const x = (e.clientX / window.innerWidth) * 100
            const y = (e.clientY / window.innerHeight) * 100
            mousePosRef.current = { x, y }

            // Manually update the subtle glow overlay without triggering React re-renders
            if (glowRef.current) {
                glowRef.current.style.background = `radial-gradient(circle 600px at ${x}% ${y}%, rgba(0, 255, 65, 0.05) 0%, rgba(0, 0, 0, 0) 60%)`
            }
        }
        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [])

    // Particle & Blob Animation System (Single Loop)
    useEffect(() => {
        if (pathname.includes('/admin')) return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationFrameId: number
        let particles: Array<{ x: number, y: number, size: number, speedX: number, speedY: number, color: string }> = []

        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
            initParticles()
        }

        const colors = ['rgba(0, 255, 65, 0.5)', 'rgba(243, 234, 95, 0.4)', 'rgba(56, 189, 248, 0.5)']

        const initParticles = () => {
            particles = []
            const particleCount = Math.floor((window.innerWidth * window.innerHeight) / 10000)
            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 2 + 0.5,
                    speedX: (Math.random() - 0.5) * 0.3, // Slower base speed
                    speedY: (Math.random() - 0.5) * 0.3,
                    color: colors[Math.floor(Math.random() * colors.length)]
                })
            }
        }

        const drawLoop = () => {
            // --- 1. Particles ---
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // Current mouse pos from Ref
            const mouseX = (mousePosRef.current.x / 100) * canvas.width
            const mouseY = (mousePosRef.current.y / 100) * canvas.height

            particles.forEach(p => {
                p.x += p.speedX
                p.y += p.speedY

                // Wrap around
                if (p.x < 0) p.x = canvas.width
                if (p.x > canvas.width) p.x = 0
                if (p.y < 0) p.y = canvas.height
                if (p.y > canvas.height) p.y = 0

                // Render particle
                ctx.beginPath()
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
                ctx.fillStyle = p.color
                ctx.fill()

                // Connect nearby particles to mouse with interaction
                const dx = mouseX - p.x
                const dy = mouseY - p.y
                const distance = Math.sqrt(dx * dx + dy * dy)

                if (distance < 180) {
                    ctx.beginPath()
                    ctx.moveTo(p.x, p.y)
                    ctx.lineTo(mouseX, mouseY)
                    ctx.strokeStyle = `rgba(0, 255, 65, ${0.4 - distance / 450})` // Brighter lines, slower fade
                    ctx.lineWidth = 1.0 // Thicker lines
                    ctx.stroke()

                    // Subtle repel
                    if (distance > 30) {
                        const forceDirectionX = dx / distance
                        const forceDirectionY = dy / distance
                        const force = (180 - distance) / 5000 // Less aggressive force
                        p.x -= forceDirectionX * force
                        p.y -= forceDirectionY * force
                    }
                }
            })

            // --- 2. CSS Blobs Shift ---
            if (blobsRef.current) {
                const b1 = blobsRef.current.children[0] as HTMLElement
                const b2 = blobsRef.current.children[1] as HTMLElement
                const b3 = blobsRef.current.children[2] as HTMLElement

                // Gentle parallax drift based on mouse position
                const tx = (mousePosRef.current.x - 50) * 2 // -100 to 100
                const ty = (mousePosRef.current.y - 50) * 2

                if (b1) b1.style.transform = `translate(${tx * 0.5}px, ${ty * 0.5}px)`
                if (b2) b2.style.transform = `translate(${-tx * 0.7}px, ${-ty * 0.7}px)`
                if (b3) b3.style.transform = `translate(${tx * -0.3}px, ${ty * 0.8}px)`
            }

            animationFrameId = requestAnimationFrame(drawLoop)
        }

        resize()
        window.addEventListener('resize', resize)
        drawLoop()

        return () => {
            window.removeEventListener('resize', resize)
            cancelAnimationFrame(animationFrameId)
        }
    }, [pathname]) // ONLY re-run if path changes, NOT on every mouse move

    if (pathname.includes('/admin')) return null

    return (
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-background">

            {/* SVG Filter for Liquid Glass / Chromatic Aberration */}
            <svg className="hidden">
                <defs>
                    <filter id="liquid-glass" x="-20%" y="-20%" width="140%" height="140%">
                        {/* Blur */}
                        <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur" />
                        {/* Color shifts for chromatic aberration */}
                        <feOffset in="blur" dx="5" dy="0" result="red-shift" />
                        <feOffset in="blur" dx="-5" dy="0" result="blue-shift" />
                        <feOffset in="blur" dx="0" dy="5" result="green-shift" />
                        {/* Component transfer to isolate channels */}
                        <feColorMatrix in="red-shift" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red" />
                        <feColorMatrix in="blue-shift" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue" />
                        <feColorMatrix in="green-shift" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green" />
                        {/* Blend channels back together */}
                        <feBlend mode="screen" in="red" in2="blue" result="rb" />
                        <feBlend mode="screen" in="rb" in2="green" result="aberration" />
                        {/* Adjust final brightness/contrast slightly */}
                        <feComponentTransfer in="aberration" result="final-glass">
                            <feFuncA type="linear" slope="0.8" />
                        </feComponentTransfer>
                        {/* Merge back with original if needed, but here we just want the pure blurred aberration */}
                    </filter>
                </defs>
            </svg>

            {/* Glowing Blobs layer under the glass */}
            <div ref={blobsRef} className="absolute inset-0 w-full h-full opacity-35 mix-blend-screen transition-transform duration-[200ms] ease-out">
                <div className="absolute top-[10%] left-[20%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-primary rounded-full blur-[100px]" />
                <div className="absolute bottom-[10%] right-[10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-blue-600 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] right-[40%] w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] bg-purple-600 rounded-full blur-[90px]" />
            </div>

            {/* The actual liquid glass layer that distorts the blobs beneath it */}
            <div
                className="absolute inset-0 w-full h-full backdrop-blur-xl"
                style={{
                    filter: "url('#liquid-glass')",
                    WebkitBackdropFilter: "blur(20px)"
                }}
            />

            {/* Animated Canvas Particles (On top of glass for clarity) */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-80"></canvas>

            {/* Interactive Mouse Follow Glow (Subtle overlay tracked by ref) */}
            <div
                ref={glowRef}
                className="absolute inset-0 transition-opacity duration-300 pointer-events-none opacity-50"
            />

            {/* Subtle Grid overlay for that tech aesthetic */}
            <div
                className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
                style={{
                    backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}
            />
        </div>
    )
}
