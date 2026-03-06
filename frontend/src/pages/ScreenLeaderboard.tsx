import { useQuery } from '@tanstack/react-query'
import { fetchLeaderboard, api } from '../lib/api'
import { useState, useEffect } from 'react'

import { Trophy, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import sparkSomeLogo from '../assets/sparkSomeLogo_Black.png'

export default function ScreenLeaderboard() {
    const { data, isLoading } = useQuery({
        queryKey: ['leaderboard'],
        queryFn: fetchLeaderboard,
        refetchInterval: 5000, // Live updates
        refetchIntervalInBackground: true
    })

    const { data: pmQueue } = useQuery({
        queryKey: ['pm_queue_global'],
        queryFn: async () => (await api.get('/game/patch-master/queue')).data,
        refetchInterval: 1000,
        refetchIntervalInBackground: true
    })

    const [pmScore, setPmScore] = useState(10000)
    const [hideOverlay, setHideOverlay] = useState(false)

    useEffect(() => {
        if (pmQueue?.status === 'playing' && pmQueue?.start_time) {
            setHideOverlay(false) // Reset hide state when a new game starts
            const totalMs = (pmQueue.pm_total_time || 200) * 1000
            const interval = setInterval(() => {
                const elapsed = Date.now() - (pmQueue.start_time * 1000)
                const ratio = elapsed / totalMs
                setPmScore(Math.floor(Math.max(0, 10000 * (1 - ratio))))
            }, 30) // Smooth 33fps update
            return () => clearInterval(interval)
        } else if (pmQueue?.status === 'finished') {
            // Keep the overlay visible for 5 seconds after finish to show W/L
            const t = setTimeout(() => setHideOverlay(true), 5000)
            return () => clearTimeout(t)
        } else {
            setHideOverlay(false)
        }
    }, [pmQueue?.status, pmQueue?.start_time, pmQueue?.pm_total_time])

    if (isLoading) return <div className="p-10 text-center animate-pulse font-mono text-2xl h-screen flex items-center justify-center bg-black text-white">SYNCHRONIZACJA WYNIKÓW...</div>

    const Section = ({ title, list }: { title: string, list: any[] }) => (
        <div className="bg-surface/80 border border-gray-700 rounded-lg p-4 xl:p-6 shadow-lg h-full flex flex-col">
            <h3 className="text-xl xl:text-2xl font-mono font-bold text-primary mb-4 border-b border-gray-800 pb-2 shrink-0">{title}</h3>
            <div className="flex justify-between text-xs xl:text-sm text-gray-500 font-mono mb-2 px-2 shrink-0">
                <span>POZYCJA / NICK</span>
                <span>SCORE</span>
            </div>
            <div className="flex-1 overflow-hidden relative flex flex-col">
                <div className={`flex flex-col gap-0 w-full shrink-0 ${list?.length > 6 ? 'animate-scroll' : ''}`}>
                    {/* Primary List */}
                    {list?.map((entry, idx) => (
                        <div key={`item-${idx}`} className="flex justify-between items-center font-mono text-base xl:text-lg border-b border-gray-800/50 pb-1 xl:pb-2 last:border-0 hover:bg-white/5 px-2 py-1 rounded shrink-0">
                            <span className="text-gray-300 flex items-center gap-2 truncate flex-1 min-w-0 mr-4">
                                <span className={`font-bold ${idx < 3 ? 'text-accent' : 'text-gray-500'}`}>#{idx + 1}</span>
                                <span className="truncate">{entry.nick}</span>
                            </span>
                            <span className="text-white font-bold text-lg xl:text-xl shrink-0">{entry.score} SCORE</span>
                        </div>
                    ))}
                    {/* Duplicate List for seamless marquee effect (only if enough items) */}
                    {list?.length > 6 && list.map((entry, idx) => (
                        <div key={`dup-${idx}`} className="flex justify-between items-center font-mono text-base xl:text-lg border-b border-gray-800/50 pb-1 xl:pb-2 last:border-0 hover:bg-white/5 px-2 py-1 rounded shrink-0">
                            <span className="text-gray-300 flex items-center gap-2 truncate flex-1 min-w-0 mr-4">
                                <span className={`font-bold ${idx < 3 ? 'text-accent' : 'text-gray-500'}`}>#{idx + 1}</span>
                                <span className="truncate">{entry.nick}</span>
                            </span>
                            <span className="text-white font-bold text-lg xl:text-xl shrink-0">{entry.score} SCORE</span>
                        </div>
                    ))}
                </div>
                {(!list || list.length === 0) && <div className="text-gray-600 text-sm">BRAK DANYCH</div>}
            </div>
        </div>
    )

    return (
        <div className="h-screen w-screen bg-black overflow-hidden p-4 xl:p-8 flex flex-col absolute top-0 left-0 right-0 bottom-0 z-50">
            {/* Animated Apple-style Glassmorphism Background Orbs */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    x: [0, 100, 0],
                    y: [0, -50, 0]
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-primary/20 rounded-full blur-[120px] pointer-events-none z-0"
            />
            <motion.div
                animate={{
                    scale: [1, 1.5, 1],
                    x: [0, -100, 0],
                    y: [0, 100, 0]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-accent/20 rounded-full blur-[150px] pointer-events-none z-0"
            />
            <motion.div
                animate={{
                    scale: [1, 1.3, 1],
                    x: [0, 50, 0],
                    y: [0, 50, 0]
                }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 5 }}
                className="absolute top-[30%] left-[30%] w-[40vw] h-[40vw] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none z-0"
            />

            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center w-full mb-6 xl:mb-10 shrink-0 relative z-10"
            >
                <div className="flex items-center w-full relative justify-center mb-4">
                    <div className="absolute left-0">
                        <img src={sparkSomeLogo} alt="SparkSome Logo" className="h-16 xl:h-24 opacity-100 invert" />
                    </div>
                    <h1 className="text-5xl xl:text-7xl font-mono font-bold text-white tracking-tighter w-full text-center">
                        RANKING OGÓLNY
                    </h1>
                </div>
                {data?.leaderboard_message && (
                    <div className="text-2xl xl:text-4xl font-bold font-mono text-accent px-8 py-4 bg-accent/20 border-2 border-accent rounded-xl backdrop-blur-md shadow-[0_0_30px_rgba(243,234,95,0.6)] text-center">
                        {data.leaderboard_message}
                    </div>
                )}
            </motion.div>

            {/* Grandmaster Section - Top Half */}
            <div className="flex-none h-[45%] mb-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-surface/60 backdrop-blur-2xl border-4 border-accent/50 rounded-2xl p-4 xl:p-8 shadow-[0_0_50px_rgba(243,234,95,0.1)] h-full flex flex-col relative overflow-hidden"
                >
                    <div className="relative z-10 flex flex-col h-full">
                        <h3 className="text-2xl xl:text-4xl font-mono font-extrabold text-accent mb-4 xl:mb-6 border-b-2 border-accent/30 pb-2 xl:pb-4 flex justify-between items-center shrink-0">
                            <span>TOP SCORE: ALL GAMES</span>
                        </h3>
                        <div className="flex-1 flex gap-4 xl:gap-8 justify-center overflow-hidden">
                            {/* 1st Place - Large Center Left-ish or Top */}
                            {data?.grandmaster?.length > 0 && (
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-yellow-400/50 shadow-[0_0_30px_rgba(255,215,0,0.2)] bg-yellow-400/10 backdrop-blur-md rounded-xl h-full relative"
                                >
                                    <Trophy size={64} className="text-yellow-400 mb-2 drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]" />
                                    <div className="flex items-center justify-center gap-4 w-full mb-4">
                                        <span className="text-yellow-400 font-black text-6xl">#1</span>
                                        <span className="text-white font-bold text-4xl xl:text-5xl truncate">{data.grandmaster[0].nick}</span>
                                    </div>
                                    <span className="text-yellow-400 font-black text-4xl xl:text-5xl">{data.grandmaster[0].score} SCORE</span>
                                </motion.div>
                            )}

                            {/* 2nd & 3rd Place - Right side */}
                            <div className="flex-1 flex flex-col gap-4 justify-center">
                                {data?.grandmaster?.slice(1, 3).map((entry: any, i: number) => {
                                    const idx = i + 1; // 1-indexed for slice
                                    return (
                                        <motion.div
                                            key={idx}
                                            whileHover={{ scale: 1.02, x: -10 }}
                                            className="flex-1 flex justify-between items-center font-mono border border-accent/20 p-4 xl:p-6 rounded-xl bg-surface/40 backdrop-blur-md"
                                        >
                                            <span className="text-gray-100 flex items-center gap-4 flex-1 min-w-0 mr-4">
                                                <span className={`font-black text-4xl xl:text-5xl shrink-0 ${idx === 1 ? 'text-gray-400' : 'text-amber-700'}`}>#{idx + 1}</span>
                                                <span className="text-2xl xl:text-3xl truncate">{entry.nick}</span>
                                            </span>
                                            <span className="text-accent font-black text-3xl xl:text-4xl">{entry.score} SCORE</span>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Game Sections - Bottom Half (3 Columns) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex-1 flex gap-4 xl:gap-8 min-h-0 relative z-10"
            >
                <div className="flex-1 min-h-0"><Section title="BINARY BRAIN" list={data?.binary_brain || []} /></div>
                <div className="flex-1 min-h-0"><Section title="PATCH MASTER" list={data?.patch_master || []} /></div>
                <div className="flex-1 min-h-0"><Section title="IT MATCH" list={data?.it_match || []} /></div>
            </motion.div>

            {/* Live Patch Master Overlay */}
            <AnimatePresence>
                {(pmQueue?.status === 'playing' || (pmQueue?.status === 'finished' && !hideOverlay)) && pmQueue?.current_player && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 100, damping: 20 }}
                        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] bg-black/90 backdrop-blur-xl border-4 ${pmQueue?.status === 'finished' ? (pmScore >= 5000 ? 'border-green-500 shadow-[0_0_150px_rgba(34,197,94,0.6)]' : 'border-red-500 shadow-[0_0_150px_rgba(239,68,68,0.6)]') : 'border-accent shadow-[0_0_150px_rgba(243,234,95,0.4)]'} p-8 xl:p-12 rounded-3xl flex flex-col items-center gap-4 w-[90vw] max-w-5xl text-center`}
                    >
                        {pmQueue?.status === 'finished' ? (
                            <>
                                <div className="text-3xl xl:text-4xl font-bold text-gray-300 font-mono uppercase mb-4">GRA ZAKOŃCZONA</div>
                                <div className="text-6xl xl:text-7xl font-black text-white truncate font-mono mt-2 mb-2">{pmQueue.current_player.nick}</div>
                                <div className={`text-[100px] xl:text-[140px] leading-none font-black tracking-widest font-mono drop-shadow-[0_0_30px_rgba(0,0,0,0.8)] ${pmScore >= 5000 ? 'text-green-500' : 'text-red-500'}`}>
                                    {pmScore >= 5000 ? 'WYGRANA!' : 'PRZEGRANA'}
                                </div>
                                <div className="text-4xl font-mono text-white mt-4">{pmScore.toString().padStart(5, '0')} PUNKTÓW</div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-4 text-3xl xl:text-4xl font-bold text-gray-300 font-mono uppercase">
                                    <Zap size={40} className="text-accent animate-pulse" /> GRA W TOKU: PATCH MASTER
                                </div>
                                <div className="text-6xl xl:text-7xl font-black text-white truncate font-mono mt-2 mb-2">{pmQueue.current_player.nick}</div>
                                <div className="text-[140px] leading-none font-black text-accent tracking-widest font-mono drop-shadow-[0_0_30px_rgba(243,234,95,0.8)]">
                                    {pmScore.toString().padStart(5, '0')}
                                </div>
                                <div className="text-2xl xl:text-3xl font-bold text-red-500 font-mono mt-4 animate-pulse flex items-center gap-3 bg-red-900/40 px-6 py-3 rounded-xl border border-red-500/50">
                                    Musi mieć powyżej 5000 punktów, żeby odebrać nagrodę!
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
