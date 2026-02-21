import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useGameStore } from '../hooks/useGameStore'
import { User, Mail, ArrowRight, ShieldCheck } from 'lucide-react'

// Define the API call separately
const registerUser = async (userData: { nick: string, email: string }) => {
    const { data } = await api.post('/auth/register', userData)
    return data
}

export default function Welcome() {
    const navigate = useNavigate()
    const login = useGameStore(state => state.login)
    const [nick, setNick] = useState('')
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')

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
            setError('All fields are required')
            return
        }
        // Basic profanity filter check could be here or backend
        mutation.mutate({ nick, email })
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-x-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="z-10 w-full max-w-md">
                <div className="text-center mb-10">
                    <h1 className="text-5xl font-mono font-bold text-white mb-2 tracking-tighter">
                        CHECK<span className="text-primary">IT</span>
                    </h1>
                    <p className="text-gray-400 font-mono text-sm tracking-widest uppercase">Rozpal innowację z SparkSomeVenture // Dołącz do gry!</p>
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
                            <label className="text-gray-400 text-xs font-mono uppercase tracking-wider block">Nick</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-gray-600" size={20} />
                                <input
                                    type="text"
                                    value={nick}
                                    onChange={e => setNick(e.target.value)}
                                    className="w-full bg-black/50 border border-gray-700 text-white pl-10 pr-4 py-3 rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono"
                                    placeholder="WPISZ NICK"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-gray-400 text-xs font-mono uppercase tracking-wider block">Email</label>
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

                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="w-full bg-primary hover:bg-green-400 text-black font-bold py-4 rounded transition-all flex justify-center items-center gap-2 group/btn"
                        >
                            {mutation.isPending ? 'ŁADOWANIE...' : 'ROZPOCZNIJ SESJĘ'}
                            <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </form>

                <div className="mt-8 text-center text-gray-600 text-xs font-mono uppercase">
                    POWERED BY SPARKSOMEVENTURE // CHECKIT V1.0.4
                </div>
            </div>
        </div>
    )
}
