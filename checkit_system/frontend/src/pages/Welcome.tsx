import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Welcome() {
    const navigate = useNavigate()
    const [nick, setNick] = useState('')
    const [email, setEmail] = useState('')

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault()
        // TODO: Call API
        console.log("Register:", nick, email)
        navigate('/dashboard')
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[url('/bg-pattern.png')] bg-cover relative overflow-hidden">
            {/* Background Overlay */}
            <div className="absolute inset-0 bg-background/90 z-0"></div>

            {/* Content */}
            <div className="z-10 w-full max-w-md p-8 border border-primary/30 rounded-lg bg-surface/50 backdrop-blur-md shadow-[0_0_50px_rgba(0,255,65,0.1)]">
                <h1 className="text-4xl font-mono font-bold text-primary mb-2 text-center tracking-tighter animate-pulse-fast">CHECK_IT_SYSTEM</h1>
                <p className="text-gray-400 text-center mb-8 font-mono text-sm">v2.0 // SYSTEM_READY</p>

                <form onSubmit={handleRegister} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-mono text-primary uppercase">Identity_Nick</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-surface-light border border-gray-700 focus:border-primary text-white p-3 rounded-none outline-none font-mono transition-all duration-300"
                            placeholder="ENTER_NICKNAME"
                            value={nick}
                            onChange={e => setNick(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-mono text-primary uppercase">Contact_Email</label>
                        <input
                            type="email"
                            required
                            className="w-full bg-surface-light border border-gray-700 focus:border-primary text-white p-3 rounded-none outline-none font-mono transition-all duration-300"
                            placeholder="ENTER_EMAIL"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-primary text-black font-bold font-mono py-4 hover:bg-white transition-colors uppercase tracking-widest clip-path-polygon"
                        style={{ clipPath: "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)" }}
                    >
                        Initialize_Session
                    </button>
                </form>

                <div className="mt-8 pt-8 border-t border-gray-800 text-center">
                    <div className="w-24 h-24 bg-white mx-auto mb-2 mix-blend-screen opacity-80">
                        {/* QR Placeholder */}
                    </div>
                    <p className="text-xs text-gray-600 font-mono">SCAN_TO_MOBILE</p>
                </div>
            </div>
        </div>
    )
}
