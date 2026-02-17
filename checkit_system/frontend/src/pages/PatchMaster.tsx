import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchPatchPanelState, submitGameScore } from '../lib/api'
import { useGameStore } from '../hooks/useGameStore'
import { Zap } from 'lucide-react'
import clsx from 'clsx'

export default function PatchMaster() {
    const navigate = useNavigate()
    const user = useGameStore(state => state.user)
    const [startTime] = useState(Date.now())
    const [currentScore, setCurrentScore] = useState(10000)
    const [isFinished, setIsFinished] = useState(false)

    // Polling Hardware State
    const { data: hardwareState } = useQuery({
        queryKey: ['patch_panel'],
        queryFn: fetchPatchPanelState,
        refetchInterval: 500, // Poll every 500ms
        enabled: !isFinished
    })

    // Timer
    useEffect(() => {
        if (isFinished) return
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime
            const score = Math.max(0, 10000 - (elapsed * 0.1))
            setCurrentScore(Math.floor(score))
        }, 100)
        return () => clearInterval(interval)
    }, [startTime, isFinished])

    const submitMutation = useMutation({
        mutationFn: submitGameScore,
        onSuccess: (data) => {
            alert(`Patch Master Solved! Score: ${data.score}`)
            navigate('/dashboard')
        }
    })

    // Check win condition
    useEffect(() => {
        if (hardwareState?.solved && !isFinished) {
            setIsFinished(true)
            const duration = Date.now() - startTime
            submitMutation.mutate({
                user_id: user?.id || 0,
                game_type: 'patch_master',
                answers: {}, // No specific answers, just solved
                duration_ms: duration
            })
        }
    }, [hardwareState, isFinished, startTime, user, submitMutation])

    const pairs = hardwareState?.pairs || []

    return (
        <div className="min-h-screen bg-background p-8 flex flex-col items-center relative overflow-hidden">
            {/* HUD */}
            <div className="w-full flex justify-between items-center mb-12 border-b border-gray-800 pb-4 z-10">
                <h1 className="text-2xl font-mono text-accent flex items-center gap-2">
                    <Zap size={24} /> PATCH_MASTER
                </h1>
                <div className="text-right">
                    <div className="text-xs text-gray-500 font-mono">CURRENT SCORE</div>
                    <div className="text-4xl font-mono font-bold text-white tracking-widest text-shadow-neon">
                        {currentScore.toString().padStart(5, '0')}
                    </div>
                </div>
            </div>

            {/* Cable Visualization */}
            <div className="grid grid-cols-4 gap-8 max-w-4xl w-full z-10">
                {pairs.map((pair: any, idx: number) => (
                    <div
                        key={idx}
                        className={clsx(
                            "relative bg-surface border-2 p-6 rounded-lg flex flex-col items-center justify-center transition-all duration-300",
                            pair.connected ? "border-primary shadow-[0_0_20px_rgba(0,255,65,0.3)]" : "border-red-500/30 opacity-80"
                        )}
                    >
                        <div className="text-xs font-mono text-gray-500 mb-2">{pair.label}</div>
                        <div className={clsx(
                            "w-4 h-4 rounded-full mb-4",
                            pair.connected ? "bg-primary animate-pulse" : "bg-red-900"
                        )}></div>
                        <div className="font-bold text-white font-mono">
                            {pair.connected ? "CONNECTED" : "OPEN"}
                        </div>
                    </div>
                ))}
            </div>

            {/* Instructions */}
            <div className="mt-12 text-center text-gray-400 font-mono max-w-lg">
                <p className="mb-4">MISSION: Connect all 8 patch cables correctly.</p>
                <p>Port references are marked on the physical panel.</p>
            </div>
        </div>
    )
}
