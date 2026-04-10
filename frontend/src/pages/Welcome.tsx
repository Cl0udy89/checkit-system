import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useGameStore } from '../hooks/useGameStore'
import { containsProfanity } from '../lib/utils'
import { User, Mail, ArrowRight, ShieldCheck, Facebook, Upload, X, CheckCircle } from 'lucide-react'
import sparkSomeLogo from '../assets/sparkSomeLogo_Black.png'

const FB_PAGE_URL = 'https://www.facebook.com/sparksomeventure'

const registerUser = async (formData: FormData) => {
    const { data } = await api.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
}

export default function Welcome() {
    const navigate = useNavigate()
    const login = useGameStore(state => state.login)
    const user = useGameStore(state => state.user)
    const [nick, setNick] = useState('')
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [agreeRules, setAgreeRules] = useState(false)
    const [agreeAge, setAgreeAge] = useState(false)
    const [agreeData, setAgreeData] = useState(false)
    const [fbLiked, setFbLiked] = useState(false)
    const [screenshot, setScreenshot] = useState<File | null>(null)
    const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (user) navigate('/dashboard')
    }, [user, navigate])

    const mutation = useMutation({
        mutationFn: registerUser,
        onSuccess: (data) => {
            login(data)
            navigate('/dashboard')
        },
        onError: (err: any) => {
            if (err.message === 'Network Error') {
                setError('ERR: Brak połączenia z serwerem.')
            } else {
                const detail = err.response?.data?.detail
                if (Array.isArray(detail)) {
                    setError(detail[0]?.msg || 'ERR: Nieprawidłowy format danych.')
                } else {
                    setError(detail || 'ERR: Nick zajęty lub błąd rejestracji.')
                }
            }
        }
    })

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!nick || !email) { setError('ERR: Wszystkie pola są wymagane.'); return }
        if (!agreeRules || !agreeAge || !agreeData) { setError('ERR: Wymagana akceptacja wszystkich zgód.'); return }
        if (!fbLiked) { setError('ERR: Potwierdź polubienie strony Sparksome Venture na Facebooku.'); return }
        if (containsProfanity(nick)) { setError('ERR: Nick zawiera niedozwolone słowa.'); return }

        const fd = new FormData()
        fd.append('nick', nick)
        fd.append('email', email)
        if (screenshot) fd.append('screenshot', screenshot)
        mutation.mutate(fd)
    }

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-x-hidden overflow-y-auto custom-scrollbar">

            {/* Grid background */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.04]"
                style={{
                    backgroundImage: 'linear-gradient(rgba(0,255,65,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,1) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />

            <div className="absolute top-0 left-0 w-96 h-96 bg-primary/[0.04] rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/[0.06] rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            {/* Logo */}
            <div className="absolute top-4 left-4 md:top-8 md:left-8 z-20">
                <img src={sparkSomeLogo} alt="SparkSome Logo" className="h-10 md:h-14 invert opacity-70" />
            </div>

            <div className="absolute top-4 right-4 md:top-8 md:right-8 z-20 text-right hidden md:block">
                <p className="text-primary/40 text-[10px] font-mono">SYS: ONLINE</p>
                <p className="text-primary/30 text-[10px] font-mono">AUTH_MODULE v1.0.4</p>
            </div>

            <div className="z-10 w-full max-w-md mt-20 md:mt-0">

                <div className="mb-8">
                    <p className="text-primary/50 text-xs font-mono mb-2 tracking-widest">
                        &gt; SYSTEM: SPARKS_CORE // INICJALIZACJA
                    </p>
                    <h1 className="text-2xl md:text-3xl font-mono font-bold text-white leading-tight tracking-tight mb-3 animate-flicker">
                        PODEJMIJ WYZWANIE<br />
                        <span className="text-primary text-glow">SPARKS_CORE</span>
                    </h1>
                    <p className="text-primary/70 font-mono text-sm tracking-widest uppercase">
                        ZAAUTORYZUJ SIĘ, ABY ROZPOCZĄĆ MISJĘ
                        <span className="terminal-cursor text-primary ml-1" />
                    </p>
                </div>

                <div className="crt-border bg-surface relative">
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-primary/20 bg-primary/[0.03]">
                        <div className="w-2 h-2 rounded-full bg-primary/40" />
                        <div className="w-2 h-2 rounded-full bg-primary/20" />
                        <div className="w-2 h-2 rounded-full bg-primary/20" />
                        <span className="text-primary/40 text-[10px] font-mono ml-2">AUTH_TERMINAL — reg_user.sh</span>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">

                        {error && (
                            <div className="border border-red-800/60 bg-red-900/10 text-red-400 p-3 font-mono text-xs flex items-start gap-2">
                                <ShieldCheck size={14} className="mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Nick */}
                        <div>
                            <label className="text-primary/60 text-[10px] font-mono uppercase tracking-widest block mb-1.5">
                                &gt; IDENTYFIKATOR (NICK)
                            </label>
                            <div className="relative crt-border bg-black/40">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/30" size={16} />
                                <input
                                    type="text"
                                    value={nick}
                                    onChange={e => {
                                        const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '')
                                        if (val.length <= 20) setNick(val)
                                    }}
                                    className="w-full bg-transparent text-primary pl-9 pr-4 py-3 font-mono text-sm focus:outline-none placeholder:text-primary/20"
                                    placeholder="WPISZ_NICK"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="text-primary/60 text-[10px] font-mono uppercase tracking-widest block mb-1.5">
                                &gt; E-MAIL
                            </label>
                            <div className="relative crt-border bg-black/40">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/30" size={16} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-transparent text-primary pl-9 pr-4 py-3 font-mono text-sm focus:outline-none placeholder:text-primary/20"
                                    placeholder="WPISZ_EMAIL"
                                />
                            </div>
                        </div>

                        {/* Consents */}
                        <div className="space-y-3">
                            <p className="text-primary/30 text-[9px] font-mono leading-relaxed">
                                Administratorem danych jest SparkSome Venture Sp. z o.o. (ul. Szlak 77/222, Kraków).
                                Dane przetwarzamy w celu organizacji konkursu (art. 6 ust. 1 lit. b RODO).{' '}
                                <a href="https://sparksome.pl/assets/Polityka%20prywatno%C5%9Bci%20SparkSome.pdf"
                                   target="_blank" rel="noreferrer"
                                   className="text-primary/60 hover:text-primary transition-colors underline">
                                    Polityka prywatności
                                </a>
                            </p>
                            <div className="border border-primary/10 bg-black/30 p-3 space-y-3">
                                {[
                                    { value: agreeRules, setter: setAgreeRules, text: 'Zapoznałem/am się z Regulaminem konkursów i aktywacji SparkSome Venture Sp. z o.o. i akceptuję jego postanowienia.' },
                                    { value: agreeAge, setter: setAgreeAge, text: 'Oświadczam, że mam ukończone 18 lat lub posiadam zgodę opiekuna prawnego.' },
                                    { value: agreeData, setter: setAgreeData, text: 'Przyjmuję do wiadomości przetwarzanie moich danych (nick, e-mail) w celu organizacji konkursu, publikacji wyników i wydania nagród.' },
                                ].map((consent, i) => (
                                    <label key={i} className="flex items-start gap-3 cursor-pointer group">
                                        <div
                                            onClick={() => consent.setter(!consent.value)}
                                            className={`w-4 h-4 border mt-0.5 shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                                                consent.value ? 'border-primary bg-primary/20' : 'border-primary/30 bg-transparent'
                                            }`}
                                        >
                                            {consent.value && <span className="text-[10px] text-primary font-mono font-bold leading-none">✓</span>}
                                        </div>
                                        <span className="text-primary/40 text-[10px] font-mono leading-relaxed group-hover:text-primary/60 transition-colors">
                                            {consent.text}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Facebook section */}
                        <div className="border border-primary/20 bg-black/30 p-4 space-y-3">
                            <p className="text-primary/50 text-[10px] font-mono uppercase tracking-widest">
                                &gt; WYMAGANE: POLUB NAS NA FACEBOOKU
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
                                        fbLiked ? 'border-primary bg-primary/20' : 'border-primary/30 bg-transparent'
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
                                <p className="text-primary/30 text-[10px] font-mono mb-1.5">SCREENSHOT POTWIERDZAJĄCY (OPCJONALNIE)</p>
                                {screenshotPreview ? (
                                    <div className="relative">
                                        <img src={screenshotPreview} alt="Screenshot" className="w-full max-h-24 object-cover border border-primary/20 opacity-60" />
                                        <button type="button" onClick={removeScreenshot}
                                            className="absolute top-1 right-1 bg-black/80 border border-primary/30 text-primary/60 hover:text-primary p-0.5 transition-colors">
                                            <X size={10} />
                                        </button>
                                        <p className="text-primary/30 font-mono text-[9px] mt-1 truncate">{screenshot?.name}</p>
                                    </div>
                                ) : (
                                    <button type="button" onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-2 w-full border border-dashed border-primary/20 hover:border-primary/50 text-primary/30 hover:text-primary/60 py-2 px-3 font-mono text-[10px] transition-all justify-center">
                                        <Upload size={12} />
                                        WGRAJ SCREENSHOT
                                    </button>
                                )}
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleScreenshot} className="hidden" />
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="w-full bg-primary hover:bg-green-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-mono font-bold py-4 text-sm tracking-widest uppercase transition-colors flex items-center justify-center gap-3 group"
                        >
                            {mutation.isPending ? (
                                <span className="terminal-cursor">AUTORYZACJA</span>
                            ) : (
                                <>
                                    AUTORYZUJ I WEJDŹ
                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-6 flex items-center justify-between text-primary/20 text-[10px] font-mono">
                    <span>CHECKIT V1.0.4</span>
                    <span>© SPARKSOME VENTURE</span>
                </div>
            </div>
        </div>
    )
}
