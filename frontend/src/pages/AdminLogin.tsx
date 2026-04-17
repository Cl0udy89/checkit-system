import { useState } from 'react'
import { loginAdmin } from '../lib/api'
import { Lock } from 'lucide-react'

export default function AdminLogin() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const formData = new FormData()
            formData.append('username', username)
            formData.append('password', password)
            const data = await loginAdmin(formData)
            localStorage.setItem('admin_token', data.access_token)
            window.location.reload()
        } catch {
            setError('ERR: Nieprawidłowe dane logowania.')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative">

            {/* Grid background */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.04]"
                style={{
                    backgroundImage: 'linear-gradient(rgba(0,255,65,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,1) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />

            <div className="w-full max-w-sm z-10">

                {/* Header */}
                <div className="mb-6">
                    <p className="text-primary/40 text-[10px] font-mono tracking-widest mb-1">&gt; SYSTEM: ROOT_ACCESS</p>
                    <h1 className="text-xl font-mono font-bold text-white flex items-center gap-2 animate-flicker">
                        <Lock size={18} className="text-primary" />
                        PANEL ADMINA
                    </h1>
                </div>

                {/* Form card */}
                <div className="crt-border bg-surface">

                    {/* Title bar */}
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-primary/20 bg-primary/[0.03]">
                        <div className="w-2 h-2 rounded-full bg-primary/40" />
                        <div className="w-2 h-2 rounded-full bg-primary/20" />
                        <div className="w-2 h-2 rounded-full bg-primary/20" />
                        <span className="text-primary/40 text-[10px] font-mono ml-2">admin_login.sh</span>
                    </div>

                    <form onSubmit={handleLogin} className="p-6 space-y-5">

                        {error && (
                            <div className="border border-red-800/60 bg-red-900/10 text-red-400 p-3 font-mono text-xs">
                                {error}
                            </div>
                        )}

                        {/* Username */}
                        <div>
                            <label className="text-primary/60 text-[10px] font-mono uppercase tracking-widest block mb-1.5">
                                &gt; IDENTYFIKATOR
                            </label>
                            <div className="crt-border bg-black/40">
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    className="w-full bg-transparent text-primary px-3 py-3 font-mono text-sm focus:outline-none placeholder:text-primary/20"
                                    placeholder="USERNAME_"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="text-primary/60 text-[10px] font-mono uppercase tracking-widest block mb-1.5">
                                &gt; HASŁO
                            </label>
                            <div className="crt-border bg-black/40">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-transparent text-primary px-3 py-3 font-mono text-sm focus:outline-none placeholder:text-primary/20"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-primary hover:bg-green-300 text-black font-mono font-bold py-3.5 text-sm tracking-widest uppercase transition-colors"
                        >
                            ZALOGUJ
                        </button>

                    </form>
                </div>

                <p className="text-primary/20 text-[10px] font-mono text-center mt-4">
                    SPARKSOMEVENTURE // ADMIN PANEL
                </p>
            </div>
        </div>
    )
}
