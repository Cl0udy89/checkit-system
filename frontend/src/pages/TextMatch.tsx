import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchTextMatchQuestions, submitGameScore, fetchGameStatus } from '../lib/api'
import { useGameStore } from '../hooks/useGameStore'
import { motion } from 'framer-motion'
import { Link2, CheckCircle, XCircle, Clock, Trophy } from 'lucide-react'
import sparkSomeLogo from '../assets/sparkSomeLogo_Black.png'

interface Pair {
    id: number
    term: string
    definition: string
}

const GAME_DURATION_S = 120

export default function TextMatch() {
    const navigate = useNavigate()
    const user = useGameStore(state => state.user)

    useEffect(() => { if (!user) navigate('/') }, [user, navigate])

    const { data: rawPairs, isLoading, error } = useQuery<Pair[]>({
        queryKey: ['textMatchQuestions'],
        queryFn: () => fetchTextMatchQuestions(8),
        retry: false,
    })

    const [started, setStarted] = useState(false)
    const [finished, setFinished] = useState(false)
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION_S)
    const [score, setScore] = useState(10000)
    const startTimeRef = useRef<number>(0)
    const finishedRef = useRef(false)

    const [termOrder, setTermOrder] = useState<number[]>([])
    const [defOrder, setDefOrder] = useState<number[]>([])

    const [selectedTerm, setSelectedTerm] = useState<number | null>(null)
    const [matched, setMatched] = useState<Set<number>>(new Set())
    const [wrongPair, setWrongPair] = useState<{ term: number; def: number } | null>(null)
    const [submitted, setSubmitted] = useState(false)

    const pairsById: Record<number, Pair> = {}
    rawPairs?.forEach(p => { pairsById[p.id] = p })

    const shuffle = <T,>(arr: T[]): T[] => {
        const a = [...arr]
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]]
        }
        return a
    }

    useEffect(() => {
        if (!rawPairs || rawPairs.length === 0) return
        const ids = rawPairs.map(p => p.id)
        setTermOrder(shuffle(ids))
        setDefOrder(shuffle(ids))
    }, [rawPairs])

    const submitMutation = useMutation({
        mutationFn: ({ finalScore }: { finalScore: number }) =>
            submitGameScore({
                user_id: user!.id,
                game_type: 'text_match',
                answers: {},
                duration_ms: Math.round((Date.now() - startTimeRef.current)),
                score: finalScore,
            }),
    })

    const endGame = useCallback((finalScore: number) => {
        if (finishedRef.current) return
        finishedRef.current = true
        setFinished(true)
        if (!submitted) {
            setSubmitted(true)
            submitMutation.mutate({ finalScore })
        }
    }, [submitted])

    useEffect(() => {
        if (!started || finished) return
        const interval = setInterval(() => {
            const elapsed = (Date.now() - startTimeRef.current) / 1000
            const remaining = Math.max(0, GAME_DURATION_S - elapsed)
            const t = Math.ceil(remaining)
            setTimeLeft(t)
            const newScore = Math.max(0, Math.floor(10000 * (remaining / GAME_DURATION_S)))
            setScore(newScore)
            if (remaining <= 0) endGame(newScore)
        }, 200)
        return () => clearInterval(interval)
    }, [started, finished, endGame])

    useEffect(() => {
        if (!started || finished || !rawPairs) return
        if (matched.size === rawPairs.length && rawPairs.length > 0) {
            endGame(score)
        }
    }, [matched, started, finished, rawPairs, score, endGame])

    const handleTermClick = (id: number) => {
        if (!started || finished || matched.has(id)) return
        setSelectedTerm(prev => (prev === id ? null : id))
        setWrongPair(null)
    }

    const handleDefClick = (id: number) => {
        if (!started || finished || matched.has(id)) return

        if (selectedTerm === null) return

        if (selectedTerm === id) {
            setMatched(prev => new Set([...prev, id]))
            setSelectedTerm(null)
            setWrongPair(null)
        } else {
            setWrongPair({ term: selectedTerm, def: id })
            setTimeout(() => {
                setWrongPair(null)
                setSelectedTerm(null)
            }, 700)
        }
    }

    const handleStart = () => {
        startTimeRef.current = Date.now()
        finishedRef.current = false
        setStarted(true)
        setScore(10000)
        setTimeLeft(GAME_DURATION_S)
    }

    const { data: gameStatus } = useQuery({
        queryKey: ['gameStatus', user?.id],
        queryFn: () => user ? fetchGameStatus(user.id) : Promise.reject('No user'),
        enabled: !!user,
    })
    const alreadyPlayed = gameStatus?.text_match?.played === true

    const errDetail = (error as any)?.response?.data?.detail
    const timerColor = timeLeft <= 20 ? 'text-red-500' : timeLeft <= 60 ? 'text-yellow-400' : 'text-green-400'

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center font-mono text-white text-2xl">
            ŁADOWANIE PYTAŃ...
        </div>
    )

    if (errDetail === 'ZAWODY_ZAKONCZONE') return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 font-mono text-white">
            <XCircle size={64} className="text-red-500" />
            <h1 className="text-4xl font-bold text-red-500">ZAWODY ZAKOŃCZONE</h1>
            <button onClick={() => navigate('/dashboard')} className="px-6 py-3 border border-gray-600 rounded-lg hover:border-white transition-colors">POWRÓT</button>
        </div>
    )

    if (errDetail === 'PRZERWA_TECHNICZNA') return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 font-mono text-white">
            <Clock size={64} className="text-yellow-400" />
            <h1 className="text-4xl font-bold text-yellow-400">PRZERWA TECHNICZNA</h1>
            <button onClick={() => navigate('/dashboard')} className="px-6 py-3 border border-gray-600 rounded-lg hover:border-white transition-colors">POWRÓT</button>
        </div>
    )

    if (errDetail === 'ALREADY_PLAYED' || alreadyPlayed) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 font-mono text-white">
            <CheckCircle size={64} className="text-green-500" />
            <h1 className="text-4xl font-bold text-green-500">JUZ ZAGRANO!</h1>
            <p className="text-gray-400 text-xl">Twoj wynik: {gameStatus?.text_match?.score ?? '—'} PKT</p>
            <button onClick={() => navigate('/dashboard')} className="px-6 py-3 border border-gray-600 rounded-lg hover:border-white transition-colors">POWROT</button>
        </div>
    )

    if (finished) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-8 font-mono text-white p-8">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-6 bg-surface/80 border-2 border-gray-700 rounded-3xl p-12 max-w-xl w-full text-center"
            >
                <Trophy size={72} className={score >= 5000 ? 'text-yellow-400' : 'text-gray-500'} />
                <h1 className="text-5xl font-bold text-white">GRA SKONCZONA</h1>
                <div className={`text-8xl font-black ${score >= 5000 ? 'text-green-400' : 'text-red-400'}`}>{score}</div>
                <p className="text-gray-400 text-xl">PUNKTOW</p>
                <p className="text-gray-500 text-sm">{matched.size}/{rawPairs?.length ?? 0} par dopasowanych</p>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="mt-4 px-8 py-3 bg-primary/20 border border-primary text-primary rounded-xl font-bold hover:bg-primary/40 transition-all"
                >
                    POWROT DO MENU
                </button>
            </motion.div>
        </div>
    )

    if (!started) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-8 font-mono text-white p-8">
            <img src={sparkSomeLogo} alt="SparkSome" className="h-12 invert mb-4" />
            <div className="flex flex-col items-center gap-4 bg-surface/80 border-2 border-secondary/50 rounded-3xl p-10 max-w-lg w-full text-center">
                <Link2 size={56} className="text-secondary mb-2" />
                <h1 className="text-4xl font-bold text-white tracking-tight">TEXT_MATCH</h1>
                <p className="text-gray-400 text-base leading-relaxed mt-2">
                    Dopasuj pojecia IT do ich definicji.<br />
                    Kliknij termin po lewej, potem pasujaca definicje po prawej.<br />
                    Masz <span className="text-secondary font-bold">120 sekund</span> – im szybciej, tym wiecej punktow!
                </p>
                <div className="mt-4 text-gray-500 text-sm">
                    {rawPairs?.length ?? 0} par do dopasowania
                </div>
                <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleStart}
                    className="mt-6 w-full py-4 bg-secondary text-black font-black text-xl rounded-xl tracking-widest hover:brightness-110 transition-all"
                >
                    START
                </motion.button>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen flex flex-col p-4 md:p-6 font-mono text-white">
            <div className="flex items-center justify-between mb-6 shrink-0">
                <img src={sparkSomeLogo} alt="SparkSome" className="h-8 invert" />
                <h1 className="text-2xl font-bold tracking-widest text-white">TEXT_MATCH</h1>
                <div className="flex items-center gap-6">
                    <div className={`text-3xl font-black ${timerColor}`}>
                        {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
                    </div>
                    <div className="text-2xl font-black text-accent">
                        {score.toString().padStart(5, '0')}
                    </div>
                </div>
            </div>

            <div className="mb-3 text-gray-400 text-sm text-center shrink-0">
                Dopasowano: <span className="text-white font-bold">{matched.size}</span> / {rawPairs?.length ?? 0}
            </div>

            <div className="flex gap-4 md:gap-6 flex-1">
                {/* LEFT: Terms */}
                <div className="flex-1 flex flex-col gap-2">
                    <div className="text-xs text-gray-500 uppercase tracking-widest text-center mb-1">POJECIA</div>
                    {termOrder.map(id => {
                        const pair = pairsById[id]
                        if (!pair) return null
                        const isMatched = matched.has(id)
                        const isSelected = selectedTerm === id
                        const isWrong = wrongPair?.term === id
                        return (
                            <motion.div
                                key={`term-${id}`}
                                onClick={() => handleTermClick(id)}
                                animate={isWrong ? { x: [0, -8, 8, -5, 5, 0] } : {}}
                                transition={{ duration: 0.35 }}
                                className={[
                                    'px-4 py-3 rounded-xl border-2 text-center text-sm md:text-base font-bold select-none transition-all',
                                    isMatched
                                        ? 'bg-green-500/20 border-green-500 text-green-400 cursor-default opacity-60'
                                        : isSelected
                                            ? 'bg-secondary/30 border-secondary text-white cursor-pointer shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                                            : isWrong
                                                ? 'bg-red-500/20 border-red-500 text-red-400 cursor-pointer'
                                                : 'bg-surface/60 border-gray-700 hover:border-secondary/70 hover:bg-secondary/10 text-white cursor-pointer',
                                ].join(' ')}
                            >
                                {isMatched
                                    ? <span className="flex items-center justify-center gap-2"><CheckCircle size={14} className="shrink-0" />{pair.term}</span>
                                    : pair.term}
                            </motion.div>
                        )
                    })}
                </div>

                {/* RIGHT: Definitions */}
                <div className="flex-1 flex flex-col gap-2">
                    <div className="text-xs text-gray-500 uppercase tracking-widest text-center mb-1">DEFINICJE</div>
                    {defOrder.map(id => {
                        const pair = pairsById[id]
                        if (!pair) return null
                        const isMatched = matched.has(id)
                        const isWrong = wrongPair?.def === id
                        const isHighlighted = selectedTerm !== null && !isMatched
                        return (
                            <motion.div
                                key={`def-${id}`}
                                onClick={() => handleDefClick(id)}
                                animate={isWrong ? { x: [0, 8, -8, 5, -5, 0] } : {}}
                                transition={{ duration: 0.35 }}
                                className={[
                                    'px-4 py-3 rounded-xl border-2 text-center text-sm leading-snug select-none transition-all',
                                    isMatched
                                        ? 'bg-green-500/20 border-green-500 text-green-400 cursor-default opacity-60'
                                        : isWrong
                                            ? 'bg-red-500/20 border-red-500 text-red-400 cursor-pointer'
                                            : isHighlighted
                                                ? 'bg-surface/60 border-gray-600 hover:border-primary hover:bg-primary/10 text-gray-200 cursor-pointer ring-1 ring-primary/20'
                                                : 'bg-surface/60 border-gray-700 hover:border-primary/70 hover:bg-primary/10 text-gray-300 cursor-pointer',
                                ].join(' ')}
                            >
                                {pair.definition}
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
