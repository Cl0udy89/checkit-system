import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

export default function InteractiveBackground() {
    const { pathname } = useLocation()
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        if (isMobile) return

        const handleMouseMove = (e: MouseEvent) => {
            // Calculate relative position based on viewport
            const x = (e.clientX / window.innerWidth) * 100
            const y = (e.clientY / window.innerHeight) * 100
            setMousePos({ x, y })
        }

        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [isMobile])

    // Specific logic: don't show full neon on Admin panel, keep it clean
    if (pathname.includes('/admin')) return null

    return (
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-background">
            {isMobile ? (
                // Mobile: Floating blobs CSS animations
                <div className="absolute inset-0 w-full h-full">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '4s' }}></div>
                </div>
            ) : (
                // Desktop: Interactive Mouse Follow Glow
                <div
                    className="absolute inset-0 transition-opacity duration-300"
                    style={{
                        background: `radial-gradient(circle 800px at ${mousePos.x}% ${mousePos.y}%, rgba(0, 255, 65, 0.08) 0%, rgba(0, 0, 0, 0) 60%)`
                    }}
                />
            )}

            {/* Subtle Grid overlay for that tech aesthetic */}
            <div
                className="absolute inset-0 opacity-10"
                style={{
                    backgroundImage: `linear-gradient(to right, #444 1px, transparent 1px), linear-gradient(to bottom, #444 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}
            />
        </div>
    )
}
