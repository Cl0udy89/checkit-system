import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useGameStore } from '../hooks/useGameStore'
import { User, Mail, ArrowRight, ShieldCheck } from 'lucide-react'
import sparkSomeLogo from '../assets/sparkSomeLogoSVGblack_white_2.png'

// Define the API call separately
const registerUser = async (userData: { nick: string, email: string }) => {
    const { data } = await api.post('/auth/register', userData)
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

    // Auto-login redirect
    useEffect(() => {
        if (user) {
            navigate('/dashboard')
        }
    }, [user, navigate])

    const mutation = useMutation({
        mutationFn: registerUser,
        onSuccess: (data) => {
            login(data) // Save to Zustand store
            navigate('/dashboard')
        },
        onError: (err: any) => {
            console.error("Registration Error:", err)
            if (err.message === "Network Error") {
                setError("Błąd połączenia. Czy serwer działa?")
            } else {
                setError(err.response?.data?.detail || 'Rejestracja nieudana. Spróbuj innego nicku.')
            }
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!nick || !email) {
            setError('Wszystkie pola są wymagane.')
            return
        }
        if (!agreeRules || !agreeAge || !agreeData) {
            setError('Musisz zaakceptować wszystkie zgody, aby wziąć udział.')
            return
        }
        // Basic profanity filter check could be here or backend
        mutation.mutate({ nick, email })
    }

    return (
        <div className="min-h-screen w-screen bg-transparent flex flex-col items-center justify-center p-4 relative overflow-y-auto">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="z-10 w-full max-w-md">
                <div className="text-center mb-8 mt-12 md:mt-4">
                    <h1 className="text-xl md:text-3xl font-mono font-bold text-white mb-4 tracking-tighter uppercase leading-snug">
                        Podejmij wyzwanie Sparks_Core<br /> i sprawdź swój tech-skill!
                    </h1>
                    <p className="text-primary font-mono text-lg tracking-widest uppercase font-bold">ZAAUTORYZUJ SIĘ, ABY ROZPOCZĄĆ MISJĘ.</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-surface border border-gray-800 p-8 rounded-xl shadow-2xl backdrop-blur-sm relative group">
                    {/* Hover Glow Effect */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-secondary rounded-xl opacity-20 group-hover:opacity-40 transition duration-1000 blur"></div>

                    <div className="relative bg-surface rounded-xl p-2 space-y-6">

                        {error && (
                            <div className="bg-red-900/20 border border-red-900 text-red-500 p-3 rounded font-mono text-sm flex items-center gap-2">
                                <ShieldCheck size={16} />
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-gray-400 text-xs font-mono uppercase tracking-wider block">NICK</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-gray-600" size={20} />
                                <input
                                    type="text"
                                    value={nick}
                                    onChange={e => {
                                        const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '')
                                        if (val.length <= 20) setNick(val)
                                    }}
                                    className="w-full bg-black/50 border border-gray-700 text-white pl-10 pr-4 py-3 rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono"
                                    placeholder="WPISZ NICK"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-gray-400 text-xs font-mono uppercase tracking-wider block">E-MAIL</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-gray-600" size={20} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-black/50 border border-gray-700 text-white pl-10 pr-4 py-3 rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono"
                                    placeholder="WPISZ EMAIL"
                                />
                            </div>
                        </div>

                        <div className="space-y-3 mt-4 text-xs text-gray-400 font-sans">
                            <p className="text-[10px] leading-tight text-gray-500 mb-4">
                                Administratorem Twoich danych osobowych jest SparkSome Venture Sp. z o.o. z siedzibą w Krakowie (ul. Szlak 77/222). Dane (np. nick i e-mail) przetwarzamy w celu organizacji i rozstrzygnięcia konkursu oraz wydania nagród (art. 6 ust. 1 lit. b RODO).
                                Podanie danych jest dobrowolne, ale konieczne do udziału. Przysługuje Ci prawo dostępu do danych, ich poprawiania, usunięcia oraz złożenia skargi do Prezesa UODO. Szczegóły znajdziesz w <a href="https://sparksome.pl/assets/Polityka%20prywatno%C5%9Bci%20SparkSome.pdf" target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold">Polityce prywatności</a>.
                            </p>
                            <div className="bg-black/40 p-3 rounded-lg border border-gray-800 space-y-3">
                                <label className="flex items-start gap-2 cursor-pointer opacity-80 hover:opacity-100 transition-opacity">
                                    <input type="checkbox" checked={agreeRules} onChange={e => setAgreeRules(e.target.checked)} className="mt-0.5 w-4 h-4 accent-primary shrink-0 transition-transform hover:scale-110" />
                                    <span>Zapoznałem/am się z Regulaminem konkursów i aktywacji organizowanych przez SparkSome Venture Sp. z o.o. i akceptuję jego postanowienia.</span>
                                </label>
                                <label className="flex items-start gap-2 cursor-pointer opacity-80 hover:opacity-100 transition-opacity">
                                    <input type="checkbox" checked={agreeAge} onChange={e => setAgreeAge(e.target.checked)} className="mt-0.5 accent-primary shrink-0" />
                                    <span>Oświadczam, że mam ukończone 18 lat lub posiadam zgodę opiekuna prawnego na udział w konkursie/aktywacji.</span>
                                </label>
                                <label className="flex items-start gap-2 cursor-pointer opacity-80 hover:opacity-100 transition-opacity">
                                    <input type="checkbox" checked={agreeData} onChange={e => setAgreeData(e.target.checked)} className="mt-0.5 accent-primary shrink-0" />
                                    <span className="text-[10px] leading-tight">Przyjmuję do wiadomości, że moje dane osobowe (nick, adres e-mail) będą przetwarzane przez SparkSome Venture Sp. z o.o. w celu organizacji i przeprowadzenia konkursu, publikacji wyników oraz wydania nagród, zgodnie z Regulaminem i Polityką prywatności.</span>
                                </label>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="w-full bg-primary hover:bg-green-400 text-black font-bold py-4 rounded transition-all flex justify-center items-center gap-2 group/btn"
                        >
                            {mutation.isPending ? 'ŁADOWANIE...' : 'AUTORYZUJ I WEJDŹ'}
                            <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </form>

                <div className="mt-8 flex flex-col items-center gap-2 text-gray-600 text-xs font-mono uppercase">
                    CHECKIT V1.0.4
                    <img src={sparkSomeLogo} alt="SparkSome Logo" className="h-16 md:h-20 opacity-100 invert mix-blend-screen mt-4" />
                </div>
            </div>
        </div>
    )
}
