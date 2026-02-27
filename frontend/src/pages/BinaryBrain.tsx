import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchGameContent, submitGameScore, BACKEND_URL } from '../lib/api'
import { useGameStore } from '../hooks/useGameStore'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap } from 'lucide-react'

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

    const { data: questions, isLoading, isError, error } = useQuery({
        queryKey: ['questions', 'binary_brain'],
        queryFn: () => fetchGameContent('binary_brain'),
        staleTime: Infinity,
        retry: false
    })

    const currentQ = questions ? questions[currentQIndex] : null

    // Load saved progress if available
    useEffect(() => {
        if (questions && user && !hasLoaded) {
            const savedStateStr = localStorage.getItem(`binary_brain_state_${user.id}`)
            if (savedStateStr) {
                try {
                    const savedState = JSON.parse(savedStateStr)
                    if (savedState.currentQIndex >= questions.length || savedState.finished) {
                        localStorage.removeItem(`binary_brain_state_${user.id}`)
                        setCurrentQIndex(0)
                        setTotalScore(0)
                        setAnswers({})
                        setQuestionStartTime(Date.now())
                    } else {
                        setCurrentQIndex(savedState.currentQIndex || 0)
                        setTotalScore(savedState.totalScore || 0)
                        setAnswers(savedState.answers || {})
                        setAnswerStats(savedState.answerStats || [])

                        // Restore exact timestamp to keep points dropping correctly
                        if (savedState.questionStartTime) {
                            setQuestionStartTime(savedState.questionStartTime)
                        } else {
                            setQuestionStartTime(Date.now())
                        }
                    }
                } catch (e) {
                    console.error("Error parsing saved state", e)
                    setCurrentQIndex(0)
                    setTotalScore(0)
                    setAnswers({})
                    setQuestionStartTime(Date.now())
                }
            } else {
                setCurrentQIndex(0)
                setTotalScore(0)
                setAnswers({})
                setAnswerStats([])
                setQuestionStartTime(Date.now())
            }
            setHasLoaded(true)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [questions, user, hasLoaded])

    // Save progress continuously
    useEffect(() => {
        if (hasLoaded && user && questions && gameState === 'playing') {
            const stateToSave = { currentQIndex, totalScore, answers, questionStartTime }
            localStorage.setItem(`binary_brain_state_${user.id}`, JSON.stringify(stateToSave))
        }
    }, [hasLoaded, currentQIndex, totalScore, answers, questionStartTime, user, questions, gameState])

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
    }, [questionStartTime, gameState, handleAnswer])

    const submitMutation = useMutation({
        mutationFn: submitGameScore,
        onSuccess: (data) => {
            // Already handled by local state, this is just to confirm save
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

        // Stop timer visually
        setGameState('feedback')

        const isCorrect = option.isCorrect
        setLastAnswerCorrect(isCorrect)

        // Calculate points for this question
        let pointsEarned = 0
        if (isCorrect) {
            pointsEarned = currentPotentialScore
            setTotalScore(prev => prev + pointsEarned)
        }

        const timeElapsed = Date.now() - questionStartTime
        const newAnswerStats = [...answerStats, { isCorrect, timeMs: timeElapsed }]
        setAnswerStats(newAnswerStats)

        // Record Answer
        const newAnswers = { ...answers, [currentQ.id]: option.text }
        setAnswers(newAnswers)

        // Force anti-cheat save immediately for the next state
        if (hasLoaded && user) {
            const nextState = {
                currentQIndex: currentQIndex + 1,
                totalScore: totalScore + pointsEarned,
                answers: newAnswers,
                answerStats: newAnswerStats,
                questionStartTime: Date.now()
            }
            localStorage.setItem(`binary_brain_state_${user.id}`, JSON.stringify(nextState))
        }

        // Wait a bit then move on
        setTimeout(() => {
            if (currentQIndex < questions.length - 1) {
                // IMPORTANT: Change state fully FIRST
                setGameState('playing')
                setLastAnswerCorrect(null)
                setCurrentPotentialScore(MAX_Q_POINTS)
                // THEN Change question
                setCurrentQIndex(prev => prev + 1)
                setQuestionStartTime(Date.now())
            } else {
                finishGame(totalScore + pointsEarned, newAnswers, newAnswerStats) // Pass final updated score
            }
        }, 1500)
    }

    function finishGame(finalScore: number, finalAnswers?: Record<string, string>, finalStats?: any[]) {
        setGameState('finished')
        const boxOpened = false
        setFinalResult({ score: finalScore, boxOpened, stats: finalStats || answerStats })

        if (user) {
            localStorage.removeItem(`binary_brain_state_${user.id}`)
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
        // We poll the content endpoint which throws 403 if blocked
        refetchInterval: 5000,
        retry: false,
        enabled: gameState === 'playing' || gameState === 'feedback'
    })

    const activeError = isError ? error : (isPollError ? pollError : null)
    const hasError = isError || isPollError

    if (isLoading) return <div className="p-10 text-center animate-pulse">LOADING_NEURAL_LINK...</div>

    if (hasError) {
        // @ts-ignore
        if (activeError?.response?.status === 403) {
            // @ts-ignore
            const detail = activeError?.response?.data?.detail
            if (detail === "ALREADY_PLAYED") {
                return (
                    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-8 text-center text-red-500 font-mono">
                        <h1 className="text-4xl font-bold mb-4">GRA ZAKOŃCZONA</h1>
                        <p className="mb-8 text-xl">Masz już zapisany wynik dla tej gry. Dozwolona jest tylko jedna gra w każdej kategorii!</p>
                        <button onClick={() => navigate('/dashboard')} className="border border-red-500 text-red-500 px-6 py-3 hover:bg-red-900/20">POWRÓT</button>
                    </div>
                )
            }
            const isBreak = detail === "PRZERWA_TECHNICZNA"
            return (
                <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-8 text-center text-red-500 font-mono">
                    <h1 className="text-4xl font-bold mb-4">{isBreak ? "PRZERWA TECHNICZNA" : "ZAWODY ZAKOŃCZONE"}</h1>
                    <p className="mb-8 text-xl">{isBreak ? "System chwilowo niedostępny. Zostań na stanowisku!" : "System został zablokowany przez administratora."}</p>
                    <button onClick={() => navigate('/dashboard')} className="border border-red-500 text-red-500 px-6 py-3 hover:bg-red-900/20">POWRÓT</button>
                </div>
            )
        }
        return <div className="p-10 text-center text-red-500">SYSTEM_ERROR: {(activeError as any)?.message || "Unknown error"}</div>
    }

    if (!questions || questions.length === 0) return <div className="p-10 text-center text-red-500">NO_DATA_FOUND</div>

    const q = questions ? questions[currentQIndex] : null
    if (!q && gameState !== 'finished') return <div className="p-10 text-center text-red-500">ERROR_LOADING_QUESTION</div>

    if (gameState === 'finished' && finalResult) {
        const stats = finalResult.stats || []
        const fastestAnswer = stats.length > 0 ? stats.reduce((min, s) => s.timeMs < min.timeMs ? s : min, stats[0]) : null
        const slowestAnswer = stats.length > 0 ? stats.reduce((max, s) => s.timeMs > max.timeMs ? s : max, stats[0]) : null
        const correctCount = stats.filter(s => s.isCorrect).length
        const incorrectCount = stats.length - correctCount

        return (
            <div className="min-h-[100dvh] bg-transparent p-4 md:p-8 flex flex-col justify-center items-center relative touch-none overflow-x-hidden">
                <h1 className="text-4xl md:text-5xl font-mono font-bold text-primary mb-6 md:mb-8 glow-text text-center">WERYFIKACJA ZAKOŃCZONA</h1>

                <div className="bg-surface border-2 border-gray-700 rounded-2xl p-4 md:p-8 shadow-2xl w-full max-w-4xl z-20 relative mb-8">
                    <div className="text-center mb-6 md:mb-8 border border-gray-700 rounded-lg bg-black/50 p-6 md:p-8">
                        <div className="text-gray-400 font-mono mb-2 text-sm md:text-base">WYNIK KOŃCOWY</div>
                        <div className="text-5xl md:text-7xl font-bold text-accent font-mono">{finalResult.score}</div>
                        {!user && <div className="text-red-500 mt-4 text-sm font-mono tracking-widest">BRAK SESJI LOGOWANIA. WYNIK NIE ZOSTAŁ ZAPISANY.</div>}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8">
                        <div className="p-3 md:p-4 border border-green-900/50 bg-green-900/10 rounded-lg flex flex-col items-center text-center">
                            <div className="text-[10px] md:text-xs text-green-500/80 mb-2 font-mono">NAJSZYBSZA ODPOWIEDŹ</div>
                            <div className="text-xl md:text-2xl font-bold text-green-400 font-mono mb-1">{fastestAnswer ? (fastestAnswer.timeMs / 1000).toFixed(2) + 's' : '---'}</div>
                        </div>
                        <div className="p-3 md:p-4 border border-red-900/50 bg-red-900/10 rounded-lg flex flex-col items-center text-center">
                            <div className="text-[10px] md:text-xs text-red-500/80 mb-2 font-mono">NAJDŁUŻSZE ZASTANOWIENIE</div>
                            <div className="text-xl md:text-2xl font-bold text-red-400 font-mono mb-1">{slowestAnswer ? (slowestAnswer.timeMs / 1000).toFixed(2) + 's' : '---'}</div>
                        </div>
                        <div className="p-3 md:p-4 border border-blue-900/50 bg-blue-900/10 rounded-lg flex flex-col items-center text-center">
                            <div className="text-[10px] md:text-xs text-blue-500/80 mb-2 font-mono">POPRAWNE</div>
                            <div className="text-xl md:text-2xl font-bold text-blue-400 font-mono mb-1">{correctCount}</div>
                        </div>
                        <div className="p-3 md:p-4 border border-orange-900/50 bg-orange-900/10 rounded-lg flex flex-col items-center text-center">
                            <div className="text-[10px] md:text-xs text-orange-500/80 mb-2 font-mono">BŁĘDNE</div>
                            <div className="text-xl md:text-2xl font-bold text-orange-400 font-mono mb-1">{incorrectCount}</div>
                        </div>
                    </div>

                    <div className="flex justify-center mt-6 md:mt-8">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="bg-gray-800 hover:bg-gray-700 text-white px-6 md:px-8 py-3 md:py-4 rounded-lg font-bold font-mono text-lg md:text-xl transition-colors border border-gray-600"
                        >
                            POWRÓT DO BAZY
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-[100dvh] bg-transparent flex flex-col p-2 md:p-6 relative touch-none overflow-hidden">
            {/* HUD */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 border-b border-gray-800 pb-2 md:pb-4 gap-2">
                <h1 className="text-xl md:text-2xl font-mono text-primary flex items-center gap-2">
                    <Zap size={20} className="md:w-6 md:h-6" /> BINARY_BRAIN
                </h1>
                <div className="flex gap-4 md:gap-8 text-right w-full md:w-auto justify-between md:justify-end">
                    <div>
                        <div className="text-[10px] md:text-xs text-gray-500 font-mono">TOTAL SCORE</div>
                        <div className="text-2xl md:text-4xl font-mono font-bold text-accent">{totalScore}</div>
                    </div>
                    <div>
                        <div className="text-[10px] md:text-xs text-gray-500 font-mono">POTENTIAL</div>
                        <div className={`text-3xl md:text-5xl font-mono font-bold tracking-widest text-shadow-neon ${gameState === 'feedback' ? (lastAnswerCorrect ? 'text-green-500' : 'text-red-500') : 'text-white'}`}>
                            {currentPotentialScore.toString().padStart(4, '0')}
                        </div>
                    </div>
                </div>
            </div>

            {/* Question Card */}
            <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full relative mt-8 md:mt-10">
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={currentQIndex}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className={`bg-surface border p-4 md:p-8 rounded-lg shadow-2xl relative ${gameState === 'feedback' ? (lastAnswerCorrect ? 'border-green-500/50 bg-green-900/10' : 'border-red-500/50 bg-red-900/10') : 'border-gray-700'}`}
                    >
                        <div className="absolute top-0 right-0 bg-gray-800 px-2 py-1 md:px-3 text-[10px] md:text-xs font-mono rounded-bl-lg">
                            Q: {currentQIndex + 1} / {questions.length}
                        </div>

                        <h2 className="text-lg md:text-2xl font-bold mb-4 md:mb-8 text-white pr-12 md:pr-16">{q?.question}</h2>

                        {/* Image Logic */}
                        {q?.image && (
                            <div className="mb-4 md:mb-6 flex justify-center mx-auto w-full">
                                <img
                                    src={`${BACKEND_URL}/content/binary_brain/images/${q.image}`}
                                    className="max-h-[12rem] md:max-h-[20rem] w-auto max-w-full object-contain rounded-lg border border-gray-700 bg-black/50 shadow-lg"
                                    onError={(e) => {
                                        if (e.currentTarget.parentElement) {
                                            e.currentTarget.parentElement.style.display = 'none';
                                        }
                                    }}
                                    alt="Question Visual"
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                            {shuffledOptions.map((opt, idx) => (
                                <button
                                    key={`${currentQIndex}-${idx}`}
                                    onClick={() => handleAnswer(opt)}
                                    // Remove the hover effect if we are in feedback mode so mobile doesn't stick
                                    disabled={gameState !== 'playing'}
                                    className={`p-3 md:p-4 text-sm md:text-base border text-left transition-all font-mono group rounded relative overflow-hidden
                                            ${gameState === 'feedback'
                                            ? (opt.isCorrect
                                                ? 'border-green-500 bg-green-500/20 text-white'
                                                : 'border-gray-800 opacity-50')
                                            : 'border-gray-600 md:hover:border-primary md:hover:bg-primary/10 text-gray-300 md:hover:text-white active:border-primary active:bg-primary/20 active:text-white'
                                        }`}
                                >
                                    <span className={`font-bold mr-2 ${gameState === 'feedback' && opt.isCorrect ? 'text-green-400' : 'text-primary'}`}>[{idx + 1}]</span>
                                    {opt.text}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Feedback Overlay Message */}
                {gameState === 'feedback' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`absolute top-[-25px] md:top-[-30px] left-0 w-full text-center text-lg md:text-xl font-bold font-mono ${lastAnswerCorrect ? 'text-green-500' : 'text-red-500'}`}
                    >
                        {lastAnswerCorrect ? "POPRAWNA ODPOWIEDŹ (+PUNKTY)" : "NIEPOPRAWNA (0 PUNKTÓW)"}
                    </motion.div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent w-full opacity-50"></div>
        </div>
    )
}
