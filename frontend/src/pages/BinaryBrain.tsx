import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchGameContent, submitGameScore } from '../lib/api'
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
    const [shuffledOptions, setShuffledOptions] = useState<any[]>([])

    // Scoring State
    const [totalScore, setTotalScore] = useState(0)
    const [currentPotentialScore, setCurrentPotentialScore] = useState(1000)
    const [questionStartTime, setQuestionStartTime] = useState(Date.now())
    const [gameStartTime] = useState(Date.now())

    // UI State
    const [gameState, setGameState] = useState<'playing' | 'feedback' | 'finished'>('playing')
    const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null)
    const [finalResult, setFinalResult] = useState<{ score: number, boxOpened: boolean } | null>(null)

    const DECAY_PER_MS = 0.05 // 50 points per second
    const MAX_Q_POINTS = 1000

    const { data: questions, isLoading, isError, error } = useQuery({
        queryKey: ['questions', 'binary_brain'],
        queryFn: () => fetchGameContent('binary_brain'),
        staleTime: Infinity,
        retry: false
    })

    // Shuffle options when question changes
    useEffect(() => {
        if (questions && questions[currentQIndex]) {
            const q = questions[currentQIndex]
            const options = [
                { text: q.answer_correct, isCorrect: true },
                { text: q.answer_wrong1, isCorrect: false },
                { text: q.answer_wrong2, isCorrect: false },
                { text: q.answer_wrong3, isCorrect: false },
            ]
            setShuffledOptions(shuffle(options))
            // Reset timer for new question
            setQuestionStartTime(Date.now())
            setCurrentPotentialScore(MAX_Q_POINTS)
        }
    }, [questions, currentQIndex])

    // Timer Effect (Per Question)
    useEffect(() => {
        if (gameState !== 'playing') return

        const interval = setInterval(() => {
            const elapsed = Date.now() - questionStartTime
            const score = Math.max(0, MAX_Q_POINTS - (elapsed * DECAY_PER_MS))
            setCurrentPotentialScore(Math.floor(score))
        }, 50)
        return () => clearInterval(interval)
    }, [questionStartTime, gameState])

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

    const handleAnswer = (option: any) => {
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

        // Record Answer
        setAnswers(prev => ({ ...prev, [currentQ.id]: option.text }))

        // Wait a bit then move on
        setTimeout(() => {
            if (currentQIndex < questions.length - 1) {
                setCurrentQIndex(prev => prev + 1)
                setGameState('playing')
                setLastAnswerCorrect(null)
            } else {
                finishGame(totalScore + pointsEarned) // Pass final updated score
            }
        }, 1500)
    }

    const finishGame = (finalScore: number) => {
        setGameState('finished')
        const boxOpened = finalScore >= 5000
        setFinalResult({ score: finalScore, boxOpened })

        if (user) {
            submitMutation.mutate({
                user_id: user.id,
                game_type: 'binary_brain',
                answers: answers, // Note: this might miss the last one if updated in state async, but for saving score explicitly we use 'score' param
                duration_ms: Date.now() - gameStartTime,
                score: finalScore
            })
        }
    }

    if (isLoading) return <div className="p-10 text-center animate-pulse">LOADING_NEURAL_LINK...</div>

    if (isError) {
        // @ts-ignore
        if (error?.response?.status === 403) {
            return (
                <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center text-red-500 font-mono">
                    <h1 className="text-4xl font-bold mb-4">ZAWODY ZAKOŃCZONE</h1>
                    <p className="mb-8 text-xl">System został zablokowany przez administratora.</p>
                    <button onClick={() => navigate('/dashboard')} className="border border-red-500 text-red-500 px-6 py-3 hover:bg-red-900/20">POWRÓT</button>
                </div>
            )
        }
        return <div className="p-10 text-center text-red-500">SYSTEM_ERROR: {(error as any).message}</div>
    }

    if (!questions || questions.length === 0) return <div className="p-10 text-center text-red-500">NO_DATA_FOUND</div>

    const q = questions ? questions[currentQIndex] : null
    if (!q && gameState !== 'finished') return <div className="p-10 text-center text-red-500">ERROR_LOADING_QUESTION</div>

    // GAME OVER SCREEN
    if (gameState === 'finished' && finalResult) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
                <h1 className="text-5xl font-mono font-bold text-primary mb-8 glow-text">SYSTEM UPDATE COMPLETE</h1>

                <div className="mb-12">
                    <div className="text-gray-400 text-xl font-mono mb-2">FINAL SCORE</div>
                    <div className="text-7xl font-bold text-white mb-8">{finalResult.score}</div>

                    <div className={`text-3xl font-bold p-4 border-2 rounded-xl ${finalResult.boxOpened ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-red-500 text-red-400 bg-red-500/10'}`}>
                        {finalResult.boxOpened ? "ACCESS GRANTED - BOX OPENING..." : "ACCESS DENIED - SCORE TOO LOW"}
                    </div>
                    {!finalResult.boxOpened && <div className="text-gray-500 mt-2 font-mono text-sm">Target: 5000 pts</div>}
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-lg font-bold font-mono text-xl transition-colors"
                    >
                        RETURN TO DASHBOARD
                    </button>
                    {!user && <div className="text-red-500 mt-4">Warning: User not logged in. Score not saved.</div>}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background flex flex-col p-6 relative overflow-hidden">
            {/* HUD */}
            <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                <h1 className="text-2xl font-mono text-primary flex items-center gap-2">
                    <Zap size={24} /> BINARY_BRAIN
                </h1>
                <div className="flex gap-8 text-right">
                    <div>
                        <div className="text-xs text-gray-500 font-mono">TOTAL SCORE</div>
                        <div className="text-3xl font-mono font-bold text-accent">{totalScore}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-mono">POTENTIAL</div>
                        <div className={`text-4xl font-mono font-bold tracking-widest text-shadow-neon ${gameState === 'feedback' ? (lastAnswerCorrect ? 'text-green-500' : 'text-red-500') : 'text-white'}`}>
                            {currentPotentialScore.toString().padStart(4, '0')}
                        </div>
                    </div>
                </div>
            </div>

            {/* Question Card */}
            <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full relative">
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={currentQIndex}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className={`bg-surface border p-8 rounded-lg shadow-2xl relative transition-colors duration-300 ${gameState === 'feedback' ? (lastAnswerCorrect ? 'border-green-500/50 bg-green-900/10' : 'border-red-500/50 bg-red-900/10') : 'border-gray-700'}`}
                    >
                        <div className="absolute top-0 right-0 bg-gray-800 px-3 py-1 text-xs font-mono rounded-bl-lg">
                            Q: {currentQIndex + 1} / {questions.length}
                        </div>

                        <h2 className="text-2xl font-bold mb-8 text-white">{q?.question}</h2>

                        {/* Image Logic */}
                        {q?.image && (
                            <div className="mb-6 rounded-lg overflow-hidden border border-gray-700 bg-black/50 mx-auto max-w-lg">
                                <img
                                    src={`/content/binary_brain/images/${q.image}`}
                                    className="w-full h-64 object-contain"
                                    onError={(e) => e.currentTarget.style.display = 'none'}
                                    alt="Question Visual"
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {shuffledOptions.map((opt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(opt)}
                                    disabled={gameState !== 'playing'}
                                    className={`p-4 border text-left transition-all font-mono group rounded relative overflow-hidden
                                        ${gameState === 'feedback'
                                            ? (opt.isCorrect
                                                ? 'border-green-500 bg-green-500/20 text-white'
                                                : 'border-gray-800 opacity-50')
                                            : 'border-gray-600 hover:border-primary hover:bg-primary/10 text-gray-300 hover:text-white'
                                        }
                                    `}
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
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`absolute top-[-50px] left-0 w-full text-center text-2xl font-bold font-mono ${lastAnswerCorrect ? 'text-green-500' : 'text-red-500'}`}
                    >
                        {lastAnswerCorrect ? "CORRECT (+POINTS)" : "INCORRECT (0 POINTS)"}
                    </motion.div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent w-full opacity-50"></div>
        </div>
    )
}
