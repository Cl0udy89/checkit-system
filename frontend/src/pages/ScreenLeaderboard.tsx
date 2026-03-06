import { useQuery } from '@tanstack/react-query'
import { fetchLeaderboard, api } from '../lib/api'
import { useState, useEffect, useRef, useMemo, memo } from 'react'
import { Trophy, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import sparkSomeLogo from '../assets/sparkSomeLogo_Black.png'

// ─── Leaderboard section ───────────────────────────────────────────────────────
// memo + defined outside parent → never remounts on pmQueue re-render
const Section = memo(({ title, list }: { title: string; list: any[] }) => (
    <div className="bg-surface/80 border border-gray-700 rounded-lg p-4 xl:p-6 shadow-lg h-full flex flex-col">
        <h3 className="text-xl xl:text-2xl 2xl:text-3xl font-mono font-bold text-primary mb-4 border-b border-gray-800 pb-2 shrink-0">{title}</h3>
        <div className="flex justify-between text-xs xl:text-sm text-gray-500 font-mono mb-2 px-2 shrink-0">
            <span>POZYCJA / NICK</span>
            <span>SCORE</span>
        </div>
        <div className="flex-1 overflow-hidden relative flex flex-col">
            <div className={`flex flex-col gap-0 w-full shrink-0 ${list?.length > 6 ? 'animate-scroll' : ''}`}>
                {list?.map((entry, idx) => (
                    <div key={`item-${idx}`} className="flex justify-between items-center font-mono text-base xl:text-xl 2xl:text-2xl border-b border-gray-800/50 pb-1 xl:pb-2 last:border-0 px-2 py-1 rounded shrink-0">
                        <span className="text-gray-300 flex items-center gap-2 truncate flex-1 min-w-0 mr-4">
                            <span className={`font-bold shrink-0 ${idx < 3 ? 'text-accent' : 'text-gray-500'}`}>#{idx + 1}</span>
                            <span className="truncate">{entry.nick}</span>
                        </span>
                        <span className="text-white font-bold text-lg xl:text-xl 2xl:text-2xl shrink-0">{entry.score} SCORE</span>
                    </div>
                ))}
                {list?.length > 6 && list.map((entry, idx) => (
                    <div key={`dup-${idx}`} className="flex justify-between items-center font-mono text-base xl:text-xl 2xl:text-2xl border-b border-gray-800/50 pb-1 xl:pb-2 last:border-0 px-2 py-1 rounded shrink-0">
                        <span className="text-gray-300 flex items-center gap-2 truncate flex-1 min-w-0 mr-4">
                            <span className={`font-bold shrink-0 ${idx < 3 ? 'text-accent' : 'text-gray-500'}`}>#{idx + 1}</span>
                            <span className="truncate">{entry.nick}</span>
                        </span>
                        <span className="text-white font-bold text-lg xl:text-xl 2xl:text-2xl shrink-0">{entry.score} SCORE</span>
                    </div>
                ))}
            </div>
            {(!list || list.length === 0) && <div className="text-gray-600 text-sm">BRAK DANYCH</div>}
        </div>
    </div>
))

// ─── Main component ───────────────────────────────────────────────────────────

export default function ScreenLeaderboard() {
    const { data, isLoading } = useQuery({
        queryKey: ['leaderboard'],
        queryFn: fetchLeaderboard,
        // Leaderboard rarely changes during an event – 30 s is plenty
        refetchInterval: 30000,
        staleTime: 25000,
        refetchIntervalInBackground: true,
    })

    const { data: pmQueue } = useQuery({
        queryKey: ['pm_queue_global'],
        queryFn: async () => (await api.get('/game/patch-master/queue')).data,
        refetchInterval: 1000,
        refetchIntervalInBackground: true,
        // select() ensures React Query only re-renders this component when the
        // fields we actually use change (structural deep-equality via replaceEqualDeep).
        // Between polls during an idle/playing state the values are identical → 0 re-renders.
        select: (d: any) => ({
            status: d.status as string | undefined,
            current_player: d.current_player as any,
            start_time: d.start_time as number | undefined,
            pm_total_time: d.pm_total_time as number | undefined,
        }),
    })

    // Score countdown: direct DOM write, never triggers React re-render
    const pmScoreRef = useRef(10000)
    const scoreDisplayRef = useRef<HTMLDivElement>(null)

    // Saved snapshot displayed for 5 s after the game ends
    const [finishedData, setFinishedData] = useState<{ player: any; score: number } | null>(null)

    const prevStatusRef = useRef<string | undefined>(undefined)
    const currentPlayerRef = useRef<any>(null)
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Keep player ref fresh so it's captured at the exact moment the game ends
    useEffect(() => {
        if (pmQueue?.current_player) currentPlayerRef.current = pmQueue.current_player
    }, [pmQueue?.current_player])

    // Effect 1: live score countdown → direct DOM, no React state, no re-render
    useEffect(() => {
        if (pmQueue?.status !== 'playing' || !pmQueue?.start_time) return
        pmScoreRef.current = 10000
        const startTime = pmQueue.start_time
        const totalMs = (pmQueue.pm_total_time || 200) * 1000
        const tick = () => {
            const elapsed = Date.now() - startTime * 1000
            const score = Math.floor(Math.max(0, 10000 * (1 - elapsed / totalMs)))
            pmScoreRef.current = score
            if (scoreDisplayRef.current) {
                scoreDisplayRef.current.textContent = score.toString().padStart(5, '0')
            }
        }
        tick()
        const interval = setInterval(tick, 50)
        return () => clearInterval(interval)
    }, [pmQueue?.status, pmQueue?.start_time, pmQueue?.pm_total_time])

    // Effect 2: overlay state machine – ref-based timer survives status skips
    useEffect(() => {
        const status = pmQueue?.status
        const prev = prevStatusRef.current
        prevStatusRef.current = status

        if (status === 'playing') {
            if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null }
            setFinishedData(null)
            return
        }

        // Detect: game just ended (status jumped FROM 'playing', or landed on 'finished')
        if (prev === 'playing' || status === 'finished') {
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
            const player = pmQueue?.current_player ?? currentPlayerRef.current
            setFinishedData({ player, score: pmScoreRef.current })
            hideTimerRef.current = setTimeout(() => {
                setFinishedData(null)
                hideTimerRef.current = null
            }, 5000)
        }
    }, [pmQueue?.status])

    // Grandmaster section: only recomputes when grandmaster data changes (every 30 s max).
    // Plain div – no motion.div, no backdrop-blur.
    const grandmasterSection = useMemo(() => (
        <div className="flex-none h-[45%] mb-6 relative z-10">
            <div className="bg-surface/60 border-4 border-accent/50 rounded-2xl p-4 xl:p-8 shadow-[0_0_50px_rgba(243,234,95,0.1)] h-full flex flex-col relative overflow-hidden">
                <div className="relative z-10 flex flex-col h-full">
                    <h3 className="text-2xl xl:text-3xl 2xl:text-4xl font-mono font-extrabold text-accent mb-4 xl:mb-6 border-b-2 border-accent/30 pb-2 xl:pb-4 shrink-0">
                        TOP SCORE: ALL GAMES
                    </h3>
                    <div className="flex-1 flex gap-4 xl:gap-8 justify-center overflow-hidden">
                        {data?.grandmaster?.length > 0 && (
                            <div className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-yellow-400/50 shadow-[0_0_30px_rgba(255,215,0,0.2)] bg-yellow-400/10 rounded-xl h-full relative">
                                <Trophy size={64} className="text-yellow-400 mb-2" />
                                <div className="flex items-center justify-center gap-4 w-full mb-4">
                                    <span className="text-yellow-400 font-black text-5xl 2xl:text-6xl shrink-0">#1</span>
                                    <span className="text-white font-bold text-3xl xl:text-4xl 2xl:text-5xl truncate">{data.grandmaster[0].nick}</span>
                                </div>
                                <span className="text-yellow-400 font-black text-3xl xl:text-4xl 2xl:text-5xl">{data.grandmaster[0].score} SCORE</span>
                            </div>
                        )}
                        <div className="flex-1 flex flex-col gap-4 justify-center">
                            {data?.grandmaster?.slice(1, 3).map((entry: any, i: number) => {
                                const idx = i + 1
                                return (
                                    <div
                                        key={idx}
                                        className="flex-1 flex justify-between items-center font-mono border border-accent/20 p-4 xl:p-6 rounded-xl bg-surface/40"
                                    >
                                        <span className="text-gray-100 flex items-center gap-4 flex-1 min-w-0 mr-4">
                                            <span className={`font-black text-3xl xl:text-4xl 2xl:text-5xl shrink-0 ${idx === 1 ? 'text-gray-400' : 'text-amber-700'}`}>#{idx + 1}</span>
                                            <span className="text-xl xl:text-2xl 2xl:text-3xl truncate">{entry.nick}</span>
                                        </span>
                                        <span className="text-accent font-black text-2xl xl:text-3xl 2xl:text-4xl">{entry.score} SCORE</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    ), [data?.grandmaster])

    if (isLoading) return (
        <div className="p-10 text-center font-mono text-2xl h-screen flex items-center justify-center bg-black text-white">
            SYNCHRONIZACJA WYNIKÓW...
        </div>
    )

    const isPlaying = pmQueue?.status === 'playing' && !!pmQueue?.current_player
    const overlayVisible = isPlaying || finishedData !== null
    const displayPlayer = isPlaying ? pmQueue.current_player : finishedData?.player
    const displayScore = finishedData?.score ?? 0
    const isFinishedMode = !isPlaying && finishedData !== null

    return (
        <div className="h-screen w-screen overflow-hidden p-4 xl:p-8 flex flex-col absolute top-0 left-0 right-0 bottom-0 z-10">

            {/* Header – plain div, no Framer Motion entrance animation */}
            <div className="flex flex-col items-center w-full mb-6 xl:mb-10 shrink-0 relative z-10">
                <div className="flex items-center w-full relative justify-center mb-4">
                    <div className="absolute left-0">
                        <img src={sparkSomeLogo} alt="SparkSome Logo" className="h-10 md:h-12 lg:h-16 xl:h-20 2xl:h-24 w-auto invert" />
                    </div>
                    <h1 className="text-4xl md:text-5xl xl:text-6xl 2xl:text-7xl font-mono font-bold text-white tracking-tighter w-full text-center">
                        RANKING OGÓLNY
                    </h1>
                </div>
                {data?.leaderboard_message && (
                    <div className="text-2xl xl:text-4xl font-bold font-mono text-accent px-8 py-4 bg-accent/20 border-2 border-accent rounded-xl shadow-[0_0_30px_rgba(243,234,95,0.6)] text-center">
                        {data.leaderboard_message}
                    </div>
                )}
            </div>

            {grandmasterSection}

            {/* Section grid – plain div, no Framer Motion */}
            <div className="flex-1 flex gap-4 xl:gap-8 min-h-0 relative z-10">
                <div className="flex-1 min-h-0"><Section title="BINARY BRAIN" list={data?.binary_brain || []} /></div>
                <div className="flex-1 min-h-0"><Section title="PATCH MASTER" list={data?.patch_master || []} /></div>
                <div className="flex-1 min-h-0"><Section title="IT MATCH" list={data?.it_match || []} /></div>
                <div className="flex-1 min-h-0"><Section title="TEXT MATCH" list={data?.text_match || []} /></div>
            </div>

            {/* ── Live Patch Master Overlay ──────────────────────────────────────────
                fixed inset-0 → always viewport-centred, unaffected by parent flex.
                Framer Motion used ONLY here (infrequent: appears/disappears ~2×/game).
                bg-black/60 wrapper dims the leaderboard cheaply without backdrop-blur.
                Inner div: simple easeOut tween (cheaper than spring on low-end CPU).   */}
            <AnimatePresence>
                {overlayVisible && displayPlayer && (
                    <motion.div
                        key="overlay-wrapper"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="fixed inset-0 flex items-center justify-center z-[100] bg-black/60"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className={`bg-black/95 border-4 ${
                                isFinishedMode
                                    ? displayScore >= 5000
                                        ? 'border-green-500 shadow-[0_0_100px_rgba(34,197,94,0.5)]'
                                        : 'border-red-500 shadow-[0_0_100px_rgba(239,68,68,0.5)]'
                                    : 'border-accent shadow-[0_0_100px_rgba(243,234,95,0.35)]'
                            } p-8 xl:p-12 rounded-3xl flex flex-col items-center gap-4 w-[90vw] max-w-5xl text-center`}
                        >
                            {isFinishedMode ? (
                                <>
                                    <div className="text-3xl xl:text-4xl font-bold text-gray-300 font-mono uppercase mb-4">GRA ZAKOŃCZONA</div>
                                    <div className="text-6xl xl:text-7xl font-black text-white truncate font-mono mt-2 mb-2">{displayPlayer.nick}</div>
                                    <div className={`text-[100px] xl:text-[140px] leading-none font-black tracking-widest font-mono ${displayScore >= 5000 ? 'text-green-500' : 'text-red-500'}`}>
                                        {displayScore >= 5000 ? 'WYGRANA!' : 'PRZEGRANA'}
                                    </div>
                                    <div className="text-4xl font-mono text-white mt-4">{displayScore.toString().padStart(5, '0')} PUNKTÓW</div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-4 text-3xl xl:text-4xl font-bold text-gray-300 font-mono uppercase">
                                        <Zap size={40} className="text-accent animate-pulse" /> GRA W TOKU: PATCH MASTER
                                    </div>
                                    <div className="text-6xl xl:text-7xl font-black text-white truncate font-mono mt-2 mb-2">{displayPlayer.nick}</div>
                                    <div
                                        ref={scoreDisplayRef}
                                        className="text-[140px] leading-none font-black text-accent tracking-widest font-mono"
                                    >
                                        {pmScoreRef.current.toString().padStart(5, '0')}
                                    </div>
                                    <div className="text-2xl xl:text-3xl font-bold text-red-500 font-mono mt-4 animate-pulse flex items-center gap-3 bg-red-900/40 px-6 py-3 rounded-xl border border-red-500/50">
                                        Musi mieć powyżej 5000 punktów, żeby odebrać nagrodę!
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
