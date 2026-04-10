import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchGameContent, submitGameScore, BACKEND_URL } from '../lib/api'
import { useGameStore } from '../hooks/useGameStore'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap } from 'lucide-react'
import sparkSomeLogo from '../assets/sparkSomeLogo_Black.png'

// Shuffle utility
const shuffle = (array: any[]) => {
    return array.map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value)
}

export default function BinaryBrain() {
    const navigate = useNavigate()
    const user = useGameStore(state => state.user)
    const [currentQIndex, setCurrentQIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [answerStats, setAnswerStats] = useState<{ isCorrect: boolean, timeMs: number }[]>([])
    const [floatingPoints, setFloatingPoints] = useState<{ id: number, val: number, label: string }[]>([])

    // Scoring State
    const [totalScore, setTotalScore] = useState(0)
    const [currentPotentialScore, setCurrentPotentialScore] = useState(1000)
    const [questionStartTime, setQuestionStartTime] = useState(Date.now())
    const [gameStartTime] = useState(Date.now())
    const [hasLoaded, setHasLoaded] = useState(false)

    // UI State
    const [gameState, setGameState] = useState<'playing' | 'feedback' | 'finished'>('playing')
    const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null)
    const [finalResult, setFinalResult] = useState<{ score: number, boxOpened: boolean, stats: any[] } | null>(null)

    const DECAY_PER_MS = 0.05 // 50 points per second
    const MAX_Q_POINTS = 1000

    const showPoints = (val: number, label: string) => {
        const id = Date.now() + Math.random()
        setFloatingPoints(prev => [...prev, { id, val, label }])
        setTimeout(() => setFloatingPoints(prev => prev.filter(p => p.id !== id)), 1200)
    }

    const { data: questions, isLoading, isError, error } = useQuery({
        queryKey: ['questions', 'binary_brain'],
        queryFn: () => fetchGameContent('binary_brain'),
        staleTime: Infinity,
        retry: false
    })

    const currentQ = questions ? questions[currentQIndex] : null

    // ── SESSION PERSISTENCE ── DO NOT REMOVE (preserves in-progress game on accidental navigation)
    // Restores question index, score, answers from sessionStorage. Cleared automatically on game finish.
    useEffect(() => {
        if (questions && user && !hasLoaded) {
            const sessionKey = `bb_session_${user.id}`
            const saved = sessionStorage.getItem(sessionKey)
            if (saved) {
                try {
                    const s = JSON.parse(saved)
                    if (typeof s.currentQIndex === 'number' && s.currentQIndex < questions.length) {
                        setCurrentQIndex(s.currentQIndex)
                        setTotalScore(s.totalScore ?? 0)
                        setAnswers(s.answers ?? {})
                        setAnswerStats(s.answerStats ?? [])
                        setQuestionStartTime(s.questionStartTime ?? Date.now())
                        setHasLoaded(true)
                        return
                    }
                } catch { /* corrupt – fall through to fresh start */ }
            }
            setCurrentQIndex(0)
            setTotalScore(0)
            setAnswers({})
            setAnswerStats([])
            setQuestionStartTime(Date.now())
            setHasLoaded(true)
        }
    }, [questions, user, hasLoaded])

    // ── SESSION PERSISTENCE ── DO NOT REMOVE
    // Saves current progress after each answered question.
    useEffect(() => {
        if (!user || !hasLoaded || gameState === 'finished') return
        sessionStorage.setItem(`bb_session_${user.id}`, JSON.stringify({
            currentQIndex, totalScore, answers, answerStats, questionStartTime
        }))
    }, [currentQIndex, totalScore]) // eslint-disable-line react-hooks/exhaustive-deps

    // Shuffle options immediately during render when question changes
    const shuffledOptions = useMemo(() => {
        if (!currentQ) return []
        const options = [
            { text: currentQ.answer_correct, isCorrect: true },
            { text: currentQ.answer_wrong1, isCorrect: false },
            { text: currentQ.answer_wrong2, isCorrect: false },
            { text: currentQ.answer_wrong3, isCorrect: false },
        ]
        return shuffle(options)
    }, [currentQ])

    // Timer Effect (Per Question)
    useEffect(() => {
        if (gameState !== 'playing') return

        const interval = setInterval(() => {
            if (gameState !== 'playing') return

            const elapsed = Date.now() - questionStartTime
            const score = Math.max(0, MAX_Q_POINTS - (elapsed * DECAY_PER_MS))

            if (score <= 0) {
                clearInterval(interval)
                setCurrentPotentialScore(0)
                handleAnswer({ isCorrect: false, text: "TIMEOUT" })
            } else {
                setCurrentPotentialScore(Math.floor(score))
            }
        }, 50)
        return () => clearInterval(interval)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [questionStartTime, gameState])

    const submitMutation = useMutation({
        mutationFn: submitGameScore,
        onSuccess: (data) => {
            console.log("Score saved:", data)
        },
        onError: (err) => {
            console.error("Failed to save score:", err)
            alert("Błąd zapisu wyniku! Sprawdź terminal.")
        }
    })

    function handleAnswer(option: any) {
        if (!questions || gameState !== 'playing') return
        const currentQ = questions[currentQIndex]

        setGameState('feedback')

        const isCorrect = option.isCorrect
        setLastAnswerCorrect(isCorrect)

        let pointsEarned = 0
        if (option.text === "TIMEOUT") {
            showPoints(0, "CZAS MINĄŁ")
        } else if (isCorrect) {
            pointsEarned = currentPotentialScore
            setTotalScore(prev => prev + pointsEarned)
            showPoints(currentPotentialScore, "POPRAWNIE")
        } else {
            showPoints(0, "BŁĄD")
        }

        const timeElapsed = Date.now() - questionStartTime
        const newAnswerStats = [...answerStats, { isCorrect, timeMs: timeElapsed }]
        setAnswerStats(newAnswerStats)

        const newAnswers = { ...answers, [currentQ.id]: option.text }
        setAnswers(newAnswers)

        setTimeout(() => {
            if (currentQIndex < questions.length - 1) {
                setGameState('playing')
                setLastAnswerCorrect(null)
                setCurrentPotentialScore(MAX_Q_POINTS)
                setCurrentQIndex(prev => prev + 1)
                setQuestionStartTime(Date.now())
            } else {
                finishGame(totalScore + pointsEarned, newAnswers, newAnswerStats)
            }
        }, 1500)
    }

    function finishGame(finalScore: number, finalAnswers?: Record<string, string>, finalStats?: any[]) {
        // ── SESSION PERSISTENCE ── DO NOT REMOVE — clear session on game completion
        if (user) sessionStorage.removeItem(`bb_session_${user.id}`)
        setGameState('finished')
        const boxOpened = false
        setFinalResult({ score: finalScore, boxOpened, stats: finalStats || answerStats })

        if (user) {
            submitMutation.mutate({
                user_id: user.id,
                game_type: 'binary_brain',
                answers: finalAnswers || answers,
                duration_ms: Date.now() - gameStartTime,
                score: finalScore
            })
        }
    }

    // Mid-game status polling
    const { isError: isPollError, error: pollError } = useQuery({
        queryKey: ['gameStatusPoll'],
        queryFn: () => fetchGameContent('binary_brain'),
        refetchInterval: 5000,
        retry: false,
        enabled: gameState === 'playing' || gameState === 'feedback'
    })

    const activeError = isError ? error : (isPollError ? pollError : null)
    const hasError = isError || isPollError

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center font-mono text-primary text-xl animate-pulse">
            &gt; LOADING_NEURAL_LINK..._
        </div>
    )

    if (hasError) {
        // @ts-ignore
        if (activeError?.response?.status === 403) {
            // @ts-ignore
            const detail = activeError?.response?.data?.detail
            if (detail === "ALREADY_PLAYED") {
                return (
                    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center font-mono">
                        <div className="crt-border bg-surface p-8 max-w-md w-full">
                            <p className="text-primary/50 text-[10px] uppercase tracking-widest mb-2">&gt; ERROR</p>
                            <h1 className="text-2xl font-bold text-red-400 mb-4">GRA ZAKOŃCZONA</h1>
                            <p className="text-primary/40 mb-8">Masz już zapisany wynik dla tej gry. Dozwolona jest tylko jedna gra w każdej kategorii!</p>
                            <button onClick={() => navigate('/dashboard')} className="border border-primary/25 hover:border-primary/60 text-primary/60 hover:text-primary px-6 py-3 font-mono text-sm transition-all">&gt; POWRÓT</button>
                        </div>
                    </div>
                )
            }
            const isBreak = detail === "PRZERWA_TECHNICZNA"
            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center font-mono">
                    <div className="crt-border bg-surface p-8 max-w-md w-full">
                        <p className="text-primary/50 text-[10px] uppercase tracking-widest mb-2">&gt; SYSTEM_STATUS</p>
                        <h1 className="text-2xl font-bold text-red-400 mb-4">{isBreak ? "PRZERWA TECHNICZNA" : "ZAWODY ZAKOŃCZONE"}</h1>
                        <p className="text-primary/40 mb-8">{isBreak ? "System chwilowo niedostępny. Zostań na stanowisku!" : "System został zablokowany przez administratora."}</p>
                        <button onClick={() => navigate('/dashboard')} className="border border-primary/25 hover:border-primary/60 text-primary/60 hover:text-primary px-6 py-3 font-mono text-sm transition-all">&gt; POWRÓT</button>
                    </div>
                </div>
            )
        }
        return <div className="p-10 text-center text-red-500 font-mono">SYSTEM_ERROR: {(activeError as any)?.message || "Unknown error"}</div>
    }

    if (!questions || questions.length === 0) return <div className="p-10 text-center text-red-500 font-mono">NO_DATA_FOUND</div>

    const q = questions ? questions[currentQIndex] : null
    if (!q && gameState !== 'finished') return <div className="p-10 text-center text-red-500 font-mono">ERROR_LOADING_QUESTION</div>

    if (gameState === 'finished' && finalResult) {
        const stats = finalResult.stats || []
        const fastestAnswer = stats.length > 0 ? stats.reduce((min, s) => s.timeMs < min.timeMs ? s : min, stats[0]) : null
        const slowestAnswer = stats.length > 0 ? stats.reduce((max, s) => s.timeMs > max.timeMs ? s : max, stats[0]) : null
        const correctCount = stats.filter(s => s.isCorrect).length
        const incorrectCount = stats.length - correctCount

        return (
            <div className="min-h-[100dvh] p-4 md:p-8 flex flex-col justify-center items-center relative overflow-x-hidden overflow-y-auto custom-scrollbar">
                {/* Grid bg */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
                    backgroundImage: 'linear-gradient(rgba(0,255,65,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,1) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }} />

                <p className="text-primary/50 text-[10px] font-mono uppercase tracking-widest mb-2 z-10">&gt; BINARY_BRAIN</p>
                <h1 className="text-3xl md:text-4xl font-mono font-bold text-primary text-glow mb-8 text-center z-10">WERYFIKACJA ZAKOŃCZONA</h1>

                <div className="crt-border bg-surface p-4 md:p-8 w-full max-w-4xl z-10 mb-8">
                    {/* Terminal titlebar */}
                    <div className="flex items-center gap-2 pb-4 mb-6 border-b border-primary/20">
                        <div className="w-2 h-2 bg-primary/40" />
                        <div className="w-2 h-2 bg-primary/20" />
                        <div className="w-2 h-2 bg-primary/20" />
                        <span className="text-primary/40 text-[10px] ml-2">results.sh</span>
                    </div>

                    <div className="text-center mb-6 md:mb-8 border border-primary/20 bg-black/50 p-6 md:p-8 flex flex-col items-center">
                        <p className="text-primary/50 text-[10px] font-mono uppercase tracking-widest mb-2">&gt; WYNIK_KOŃCOWY</p>
                        <span className="font-mono font-black text-primary text-glow-lg tabular-nums" style={{ fontSize: 'clamp(3rem, 10vw, 5rem)' }}>{finalResult.score}</span>
                        {!user && <div className="text-red-500 mt-4 text-sm font-mono tracking-widest">BRAK SESJI LOGOWANIA. WYNIK NIE ZOSTAŁ ZAPISANY.</div>}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-6 md:mb-8">
                        <div className="p-3 md:p-4 border border-primary/20 bg-primary/[0.03] flex flex-col items-center text-center">
                            <p className="text-[10px] text-primary/50 mb-2 font-mono uppercase tracking-widest">&gt; NAJSZYBSZA</p>
                            <span className="text-xl md:text-2xl font-bold text-primary font-mono">{fastestAnswer ? (fastestAnswer.timeMs / 1000).toFixed(2) + 's' : '---'}</span>
                        </div>
                        <div className="p-3 md:p-4 border border-red-500/20 bg-red-500/[0.03] flex flex-col items-center text-center">
                            <p className="text-[10px] text-red-400/50 mb-2 font-mono uppercase tracking-widest">&gt; NAJDŁUŻSZA</p>
                            <span className="text-xl md:text-2xl font-bold text-red-400 font-mono">{slowestAnswer ? (slowestAnswer.timeMs / 1000).toFixed(2) + 's' : '---'}</span>
                        </div>
                        <div className="p-3 md:p-4 border border-primary/20 bg-primary/[0.03] flex flex-col items-center text-center">
                            <p className="text-[10px] text-primary/50 mb-2 font-mono uppercase tracking-widest">&gt; POPRAWNE</p>
                            <span className="text-xl md:text-2xl font-bold text-primary font-mono">{correctCount}</span>
                        </div>
                        <div className="p-3 md:p-4 border border-red-500/20 bg-red-500/[0.03] flex flex-col items-center text-center">
                            <p className="text-[10px] text-red-400/50 mb-2 font-mono uppercase tracking-widest">&gt; BŁĘDNE</p>
                            <span className="text-xl md:text-2xl font-bold text-red-400 font-mono">{incorrectCount}</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-center mt-6 md:mt-8">
                        <img src={sparkSomeLogo} alt="SparkSome Logo" className="h-12 md:h-16 invert mb-8 opacity-60" />
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="border border-primary/25 hover:border-primary/60 bg-primary/[0.04] hover:bg-primary/[0.08] text-primary/60 hover:text-primary px-8 py-4 font-bold font-mono text-lg transition-all"
                        >
                            &gt; POWRÓT_DO_BAZY
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-[100dvh] flex flex-col p-2 md:p-6 relative overflow-x-hidden overflow-y-auto md:overflow-hidden custom-scrollbar">
            {/* Grid bg */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
                backgroundImage: 'linear-gradient(rgba(0,255,65,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,1) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
            }} />

            {/* HUD */}
            <div className="w-full md:w-2/3 flex justify-between items-center mb-4 gap-4 z-10 relative mx-auto crt-border bg-surface px-4 md:px-6 py-3 md:py-4">
                <div className="flex flex-col gap-1 shrink-0">
                    <p className="text-primary/50 text-[9px] font-mono uppercase tracking-widest">&gt; BINARY_BRAIN</p>
                    <h1 className="text-lg md:text-2xl font-mono text-primary flex items-center gap-2 font-bold tracking-wider">
                        <Zap size={18} className="shrink-0" />
                        <span className="text-glow">BINARY_BRAIN</span>
                    </h1>
                    <img src={sparkSomeLogo} alt="SparkSome Logo" className="h-6 md:h-8 w-auto object-contain invert opacity-40" />
                </div>
                <div className="flex gap-4 md:gap-10">
                    <div className="flex flex-col items-center">
                        <p className="text-[9px] md:text-[10px] text-primary/40 font-mono tracking-widest uppercase">TOTAL</p>
                        <span className="font-mono font-black text-primary text-glow tabular-nums text-xl md:text-4xl">{totalScore}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <p className="text-[9px] md:text-[10px] text-primary/40 font-mono tracking-widest uppercase">PULA</p>
                        <span className={`text-2xl md:text-5xl font-mono font-bold tracking-widest tabular-nums ${gameState === 'feedback' ? (lastAnswerCorrect ? 'text-primary text-glow-lg' : 'text-red-400') : 'text-white'}`}>
                            {currentPotentialScore.toString().padStart(4, '0')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Question Card */}
            <div className="flex-1 flex flex-col justify-center">
                <div className="w-full md:w-2/3 mx-auto mt-4 md:mt-6 relative">
                    <div className="absolute inset-0 flex justify-center items-center pointer-events-none z-50">
                        <AnimatePresence>
                            {floatingPoints.map(fp => (
                                <motion.div
                                    key={fp.id}
                                    initial={{ opacity: 0, y: 0, scale: 0.4 }}
                                    animate={{ opacity: 1, y: -80, scale: 1.8 }}
                                    exit={{ opacity: 0, scale: 1.4 }}
                                    transition={{ duration: 0.35, ease: 'easeOut' }}
                                    className={`w-full font-black text-4xl md:text-5xl text-center ${fp.val > 0 ? 'text-primary text-glow-lg' : 'text-red-400 drop-shadow-[0_0_20px_rgba(239,68,68,1)]'}`}
                                >
                                    {fp.val > 0 ? `+${fp.val}` : fp.val}
                                    <div className="text-xl md:text-2xl text-center opacity-90 mt-1 font-bold tracking-widest">{fp.label}</div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    <AnimatePresence mode='wait'>
                        <motion.div
                            key={currentQIndex}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className={`crt-border bg-surface p-4 md:p-8 relative overflow-hidden ${gameState === 'feedback' ? (lastAnswerCorrect ? 'shadow-[0_0_40px_rgba(0,255,65,0.2)]' : 'shadow-[0_0_40px_rgba(239,68,68,0.2)]') : ''}`}
                        >
                            {/* Feedback dim overlay */}
                            {gameState === 'feedback' && (
                                <div className="absolute inset-0 bg-black/55 z-40 pointer-events-none transition-opacity duration-200" />
                            )}

                            <div className="absolute top-0 right-0 border-l border-b border-primary/20 bg-surface px-3 py-1 text-[10px] font-mono text-primary/50">
                                Q:{currentQIndex + 1}/{questions.length}
                            </div>

                            <h2 className="text-lg md:text-2xl font-bold mb-4 md:mb-8 text-white pr-12 md:pr-16 font-mono">{q?.question}</h2>

                            {q?.image && (
                                <div className="mb-4 md:mb-6 flex justify-center mx-auto w-full">
                                    <img
                                        src={`${BACKEND_URL}/content/binary_brain/images/${q.image}`}
                                        className="max-h-[12rem] md:max-h-[20rem] w-auto max-w-full object-contain border border-primary/20 bg-black/50"
                                        onError={(e) => {
                                            if (e.currentTarget.parentElement) {
                                                e.currentTarget.parentElement.style.display = 'none';
                                            }
                                        }}
                                        alt="Question Visual"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                                {shuffledOptions.map((opt, idx) => (
                                    <button
                                        key={`${currentQIndex}-${idx}`}
                                        onClick={() => handleAnswer(opt)}
                                        disabled={gameState !== 'playing'}
                                        className={`p-3 md:p-4 text-sm md:text-base border text-left transition-all font-mono relative min-h-[3.5rem] break-words
                                            ${gameState === 'feedback'
                                                ? (opt.isCorrect
                                                    ? 'border-primary bg-primary/10 text-white shadow-[0_0_20px_rgba(0,255,65,0.15)]'
                                                    : 'border-primary/10 opacity-40')
                                                : 'border-primary/20 hover:border-primary/60 hover:bg-primary/[0.06] text-primary/70 hover:text-white active:border-primary active:bg-primary/10 active:text-white'
                                            }`}
                                    >
                                        <span className={`font-bold mr-2 ${gameState === 'feedback' && opt.isCorrect ? 'text-primary text-glow' : 'text-primary/50'}`}>[ {String.fromCharCode(65 + idx)} ]</span>
                                        {opt.text}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Feedback message */}
                    {gameState === 'feedback' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`absolute top-[-28px] left-0 w-full text-center text-sm font-bold font-mono ${lastAnswerCorrect ? 'text-primary text-glow' : 'text-red-400'}`}
                        >
                            {lastAnswerCorrect ? "POPRAWNA ODPOWIEDŹ (+PUNKTY)" : "NIEPOPRAWNA (0 PUNKTÓW)"}
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent w-full opacity-50" />
        </div>
    )
}
