import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchGameContent, submitGameScore } from '../lib/api'
import { useGameStore } from '../hooks/useGameStore'
import { Search, Check, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ITMatch() {
    const navigate = useNavigate()
    const user = useGameStore(state => state.user)
    const [currentQIndex, setCurrentQIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [startTime] = useState(Date.now())
    const [currentPotentialScore, setCurrentPotentialScore] = useState(10000)

    // Polling Hardware State
    const { data: questions, isLoading } = useQuery({
        queryKey: ['questions', 'it_match'],
        queryFn: () => fetchGameContent('it_match'),
        staleTime: Infinity
    })

    useEffect(() => {
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime
            const score = Math.max(0, 10000 - (elapsed * 0.1))
            setCurrentPotentialScore(Math.floor(score))
        }, 100)
        return () => clearInterval(interval)
    }, [startTime])

    const submitMutation = useMutation({
        mutationFn: submitGameScore,
        onSuccess: (data) => {
            alert(`IT Match Finished! Score: ${data.score}`)
            navigate('/dashboard')
        }
    })

    const handleAnswer = (choice: string) => {
        if (!questions) return
        const currentQ = questions[currentQIndex]
        setAnswers(prev => ({ ...prev, [currentQ.ID]: choice }))

        if (currentQIndex < questions.length - 1) {
            setCurrentQIndex(prev => prev + 1)
        } else {
            const duration = Date.now() - startTime
            submitMutation.mutate({
                user_id: user?.id || 0,
                game_type: 'it_match',
                answers: { ...answers, [currentQ.ID]: choice },
                duration_ms: duration
            })
        }
    }

    if (isLoading) return <div className="p-10 text-center animate-pulse">LOADING_DATA_STREAM...</div>
    if (!questions || questions.length === 0) return <div className="p-10 text-center text-red-500">NO_DATA_FOUND</div>

    const q = questions[currentQIndex]

    return (
        <div className="min-h-screen bg-background p-6 flex flex-col relative overflow-hidden">
            {/* HUD */}
            <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                <h1 className="text-2xl font-mono text-primary flex items-center gap-2">
                    <Search size={24} /> IT_MATCH
                </h1>
                <div className="text-right">
                    <div className="text-xs text-gray-500 font-mono">POTENTIAL SCORE</div>
                    <div className="text-4xl font-mono font-bold text-white tracking-widest text-shadow-neon">
                        {currentPotentialScore.toString().padStart(5, '0')}
                    </div>
                </div>
            </div>

            {/* Card */}
            <div className="flex-1 flex flex-col justify-center items-center max-w-md mx-auto w-full relative">
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={currentQIndex}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8, x: 200 }} // Swipe effect
                        className="bg-surface border border-gray-700 rounded-xl overflow-hidden shadow-2xl w-full"
                    >
                        {/* Image Area */}
                        <div className="h-64 bg-gray-900 flex items-center justify-center relative">
                            {/* Placeholder or Real Image */}
                            {/* TODO: Use real image path: http://localhost:8000/content/it_match/images/{q.SCIEZKA_FOTO} */}
                            {q.SCIEZKA_FOTO ? (
                                <img
                                    src={`http://localhost:8000/content/it_match/images/${q.ID}.jpg`}
                                    alt="Question"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="text-gray-600 font-mono">NO_IMAGE_DATA</div>
                            )}
                            <div className="absolute font-mono top-4 right-4 bg-black/50 px-2 rounded text-xs">{currentQIndex + 1}/{questions.length}</div>
                        </div>

                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-6 text-center">{q.PYTANIE}</h2>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => handleAnswer('NO')}
                                    className="flex-1 bg-red-900/50 hover:bg-red-600 border border-red-500 text-white py-4 rounded-lg flex justify-center gap-2 transition-all"
                                >
                                    <X /> NO
                                </button>
                                <button
                                    onClick={() => handleAnswer('YES')}
                                    className="flex-1 bg-green-900/50 hover:bg-green-600 border border-green-500 text-white py-4 rounded-lg flex justify-center gap-2 transition-all"
                                >
                                    <Check /> YES
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    )
}
