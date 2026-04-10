import { useState, useRef } from 'react'
import { loginAdmin } from '../lib/api'
import { Lock, Facebook, Upload, X, CheckCircle } from 'lucide-react'

const FB_PAGE_URL = 'https://www.facebook.com/sparksomeventure'

export default function AdminLogin() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [fbLiked, setFbLiked] = useState(false)
    const [screenshot, setScreenshot] = useState<File | null>(null)
    const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!fbLiked) {
            setError('ERR: Potwierdź polubienie strony na Facebooku.')
            return
        }
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

    const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setScreenshot(file)
        const reader = new FileReader()
        reader.onload = () => setScreenshotPreview(reader.result as string)
        reader.readAsDataURL(file)
    }

    const removeScreenshot = () => {
        setScreenshot(null)
        setScreenshotPreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
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

                        {/* Facebook section */}
                        <div className="border border-primary/20 bg-black/30 p-4 space-y-3">
                            <p className="text-primary/50 text-[10px] font-mono uppercase tracking-widest">
                                &gt; WYMAGANE: POTWIERDŹ POLUBIENIE
                            </p>

                            <a
                                href={FB_PAGE_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 w-full border border-primary/25 hover:border-primary/60 bg-primary/[0.04] hover:bg-primary/[0.08] text-primary/60 hover:text-primary py-2.5 px-3 font-mono text-xs transition-all cursor-pointer"
                            >
                                <Facebook size={14} />
                                PRZEJDŹ DO STRONY NA FACEBOOK
                            </a>

                            <label className="flex items-start gap-3 cursor-pointer group">
                                <div
                                    onClick={() => setFbLiked(!fbLiked)}
                                    className={`w-4 h-4 border mt-0.5 shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                                        fbLiked
                                            ? 'border-primary bg-primary/20'
                                            : 'border-primary/30 bg-transparent'
                                    }`}
                                >
                                    {fbLiked && <CheckCircle size={10} className="text-primary" />}
                                </div>
                                <span className="text-primary/40 text-[10px] font-mono leading-relaxed group-hover:text-primary/60 transition-colors">
                                    Potwierdzam, że polubiłem/am stronę Sparksome Venture na Facebooku
                                </span>
                            </label>

                            {/* Screenshot upload */}
                            <div>
                                <p className="text-primary/30 text-[10px] font-mono mb-1.5">SCREENSHOT (OPCJONALNIE)</p>
                                {screenshotPreview ? (
                                    <div className="relative">
                                        <img
                                            src={screenshotPreview}
                                            alt="Screenshot"
                                            className="w-full max-h-28 object-cover border border-primary/20 opacity-60"
                                        />
                                        <button
                                            type="button"
                                            onClick={removeScreenshot}
                                            className="absolute top-1 right-1 bg-black/80 border border-primary/30 text-primary/60 hover:text-primary p-0.5 transition-colors"
                                        >
                                            <X size={10} />
                                        </button>
                                        <p className="text-primary/30 font-mono text-[9px] mt-1 truncate">{screenshot?.name}</p>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-2 w-full border border-dashed border-primary/20 hover:border-primary/50 text-primary/30 hover:text-primary/60 py-2 px-3 font-mono text-[10px] transition-all justify-center"
                                    >
                                        <Upload size={12} />
                                        WGRAJ SCREENSHOT
                                    </button>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleScreenshot}
                                    className="hidden"
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
                    CHECKIT ADMIN // SPARKSOME VENTURE
                </p>
            </div>
        </div>
    )
}
