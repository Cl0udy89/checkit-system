import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchGameContent, submitGameScore } from '../lib/api'
import { useGameStore } from '../hooks/useGameStore'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Clock, AlertTriangle } from 'lucide-react'

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
    const [startTime] = useState(Date.now())
    const [timeLeft, setTimeLeft] = useState(100) // Percentage for visual bar

    // Game config
    const MAX_TIME_MS = 60000 // 60s total for quiz? Or just linear decay based on speed.
    // Prompt says "Punkty spadają liniowo... Licznik musi wizualnie uciekać". 
    // Let's show a "Points" counter descending from 10000.
    const START_POINTS = 10000
    const DECAY_PER_MS = 0.05 // 50 points per second
    const [currentPotentialScore, setCurrentPotentialScore] = useState(START_POINTS)

    const { data: questions, isLoading } = useQuery({
        queryKey: ['questions', 'binary_brain'],
        queryFn: () => fetchGameContent('binary_brain'),
        staleTime: Infinity
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
        }
    }, [questions, currentQIndex])

    // Timer Effect
    useEffect(() => {
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime
            const score = Math.max(0, START_POINTS - (elapsed * DECAY_PER_MS))
            setCurrentPotentialScore(Math.floor(score))

            if (score <= 0) {
                // Time over? Or just 0 points?
                // Let's just keep it at 0.
            }
        }, 50)
        return () => clearInterval(interval)
    }, [startTime])

    const submitMutation = useMutation({
        mutationFn: submitGameScore,
        onSuccess: (data) => {
            // Show result modal or navigate
            alert(`Game Over! Score: ${data.score}. Triggered: ${data.score > 8000 ? 'YES' : 'NO'}`) // Simple alert for now
            navigate('/dashboard')
        }
    })

    const handleAnswer = (option: any) => {
        if (!questions) return
        const currentQ = questions[currentQIndex]

        // Save answer (we could save the text or isCorrect status)
        // Backend expects { question_id: answer_text }
        // Although for validation, strict matching is harder if text changes.
        // Let's assume backend validates by text match

        // For UI feedback, we can flash red/green here if we wanted.

        setAnswers(prev => ({ ...prev, [currentQ.id]: option.text }))

        if (currentQIndex < questions.length - 1) {
            setCurrentQIndex(prev => prev + 1)
        } else {
            // Finish
            const duration = Date.now() - startTime
            // Calculate score locally for "fun" display, but backend does real calc usually.
            // Here we just submit.
            submitMutation.mutate({
                user_id: user?.id || 0,
                game_type: 'binary_brain',
                answers: { ...answers, [currentQ.id]: option.text },
                duration_ms: duration
            })
        }
    }

    if (isLoading) return <div className="p-10 text-center animate-pulse">LOADING_NEURAL_LINK...</div>
    if (!questions || questions.length === 0) return <div className="p-10 text-center text-red-500">NO_DATA_FOUND</div>

    const q = questions ? questions[currentQIndex] : null

    if (!q) return <div className="p-10 text-center text-red-500">ERROR_LOADING_QUESTION</div>

    return (
        <div className="min-h-screen bg-background flex flex-col p-6 relative overflow-hidden">
            {/* HUD */}
            <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                <h1 className="text-2xl font-mono text-primary flex items-center gap-2">
                    <Zap size={24} /> BINARY_BRAIN
                </h1>
                <div className="text-right">
                    <div className="text-xs text-gray-500 font-mono">POTENTIAL SCORE</div>
                    <div className="text-4xl font-mono font-bold text-white tracking-widest text-shadow-neon">
                        {currentPotentialScore.toString().padStart(5, '0')}
                    </div>
                </div>
            </div>

            {/* Question Card */}
            <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full">
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={currentQIndex}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="bg-surface border border-gray-700 p-8 rounded-lg shadow-2xl relative"
                    >
                        <div className="absolute top-0 right-0 bg-gray-800 px-3 py-1 text-xs font-mono rounded-bl-lg">
                            Q: {currentQIndex + 1} / {questions.length}
                        </div>

                        <h2 className="text-2xl font-bold mb-8 text-white">{q.question}</h2>

                        {/* Image Logic */}
                        {q.image && (
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
                                    className="p-4 border border-gray-600 hover:border-primary hover:bg-primary/10 text-left transition-all font-mono group rounded relative overflow-hidden"
                                >
                                    <span className="text-primary font-bold mr-2 group-hover:text-white">[{idx + 1}]</span>
                                    {opt.text}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent w-full opacity-50"></div>
        </div>
    )
}
