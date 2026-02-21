import { useEffect, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'


export default function InteractiveBackground() {
    const { pathname } = useLocation()
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const x = (e.clientX / window.innerWidth) * 100
            const y = (e.clientY / window.innerHeight) * 100
            setMousePos({ x, y })
        }
        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [])

    // Particle System
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

        const colors = ['rgba(0, 255, 65, 0.4)', 'rgba(243, 234, 95, 0.4)', 'rgba(56, 189, 248, 0.4)']

        const initParticles = () => {
            particles = []
            const particleCount = Math.floor((window.innerWidth * window.innerHeight) / 15000)
            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 2 + 0.5,
                    speedX: (Math.random() - 0.5) * 0.5,
                    speedY: (Math.random() - 0.5) * 0.5,
                    color: colors[Math.floor(Math.random() * colors.length)]
                })
            }
        }

        const drawParticles = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // Mouse interaction radius
            const mouseX = (mousePos.x / 100) * canvas.width
            const mouseY = (mousePos.y / 100) * canvas.height

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

                // Connect nearby particles to mouse
                const dx = mouseX - p.x
                const dy = mouseY - p.y
                const distance = Math.sqrt(dx * dx + dy * dy)

                if (distance < 150) {
                    ctx.beginPath()
                    ctx.moveTo(p.x, p.y)
                    ctx.lineTo(mouseX, mouseY)
                    ctx.strokeStyle = `rgba(0, 255, 65, ${0.15 - distance / 1000})`
                    ctx.lineWidth = 0.5
                    ctx.stroke()

                    // Subtle repel
                    const forceDirectionX = dx / distance
                    const forceDirectionY = dy / distance
                    const force = (150 - distance) / 150
                    p.x -= forceDirectionX * force * 2
                    p.y -= forceDirectionY * force * 2
                }
            })

            animationFrameId = requestAnimationFrame(drawParticles)
        }

        resize()
        window.addEventListener('resize', resize)
        drawParticles()

        return () => {
            window.removeEventListener('resize', resize)
            cancelAnimationFrame(animationFrameId)
        }
    }, [pathname, mousePos])

    // Specific logic: don't show full neon on Admin panel, keep it clean
    if (pathname.includes('/admin')) return null

    return (
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-background">

            {/* Animated Canvas Particles */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60"></canvas>

            {/* Floating Multi-color CSS Blobs */}
            <div className="absolute inset-0 w-full h-full mix-blend-screen opacity-40">
                <div
                    className="absolute top-[10%] left-[20%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-primary rounded-full blur-[120px] transition-transform duration-[10000ms] ease-in-out"
                    style={{ transform: `translate(${mousePos.x * 0.2}px, ${mousePos.y * 0.2}px)` }}
                />
                <div
                    className="absolute bottom-[10%] right-[10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-blue-600 rounded-full blur-[150px] transition-transform duration-[15000ms] ease-in-out"
                    style={{ transform: `translate(${-mousePos.x * 0.3}px, ${-mousePos.y * 0.3}px)` }}
                />
                <div
                    className="absolute top-[40%] right-[40%] w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] bg-purple-600 rounded-full blur-[100px] transition-transform duration-[8000ms] ease-in-out"
                    style={{ transform: `translate(${mousePos.x * -0.1}px, ${mousePos.y * 0.4}px)` }}
                />
            </div>

            {/* Interactive Mouse Follow Glow (Subtle overlay) */}
            <div
                className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
                style={{
                    background: `radial-gradient(circle 600px at ${mousePos.x}% ${mousePos.y}%, rgba(0, 255, 65, 0.05) 0%, rgba(0, 0, 0, 0) 60%)`
                }}
            />

            {/* Subtle Grid overlay for that tech aesthetic */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}
            />
        </div>
    )
}
