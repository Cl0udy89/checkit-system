import { useQuery } from '@tanstack/react-query'
import { fetchLeaderboard } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trophy } from 'lucide-react'
import { useEffect } from 'react'
import sparkSomeLogo from '../assets/sparkSomeLogo_Black.png'

export default function Leaderboard() {
    const navigate = useNavigate()
    const { data, isLoading } = useQuery({
        queryKey: ['leaderboard'],
        queryFn: fetchLeaderboard,
        refetchInterval: 5000 // Live updates
    })

    // Auto-scroll logic for TV
    useEffect(() => {
        const isTV = new URLSearchParams(window.location.search).get('tv') === '1'
        if (!isTV) return

        const interval = setInterval(() => {
            if (window.scrollY + window.innerHeight >= document.body.scrollHeight) {
                window.scrollTo({ top: 0, behavior: 'smooth' })
            } else {
                window.scrollBy({ top: 1, behavior: 'smooth' })
            }
        }, 50)
        return () => clearInterval(interval)
    }, [data])

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center font-mono text-primary text-xl animate-pulse">
            &gt; SYNCHRONIZACJA_WYNIKÓW..._
        </div>
    )

    const Section = ({ title, list }: { title: string, list: any[] }) => (
        <div className="crt-border bg-surface p-4 md:p-5 h-full flex flex-col">
            {/* Terminal titlebar */}
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-primary/20">
                <div className="w-2 h-2 bg-primary/40" />
                <div className="w-2 h-2 bg-primary/20" />
                <div className="w-2 h-2 bg-primary/20" />
                <span className="text-primary/40 text-[10px] ml-2">{title.toLowerCase().replace(' ', '_')}.sh</span>
            </div>
            <p className="text-primary/50 text-[10px] font-mono uppercase tracking-widest mb-1">&gt; RANKING</p>
            <h3 className="text-base md:text-lg font-mono font-bold text-primary text-glow mb-4 shrink-0">{title}</h3>
            <div className="flex justify-between text-[10px] text-primary/30 font-mono mb-2 px-1 shrink-0 uppercase tracking-widest">
                <span>POS / NICK</span>
                <span>PKT</span>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar h-[300px]">
                <div className="space-y-1">
                    {list?.map((entry, idx) => (
                        <div key={idx} className={`flex items-center font-mono text-sm border-b border-primary/[0.08] pb-1.5 last:border-0 px-1 py-1 gap-2 ${idx === 0 ? 'bg-primary/[0.04]' : ''}`}>
                            <span className={`font-bold shrink-0 w-8 text-sm ${idx === 0 ? 'text-primary text-glow' : idx < 3 ? 'text-primary/70' : 'text-primary/30'}`}>#{idx + 1}</span>
                            <span className={`truncate flex-1 min-w-0 ${idx === 0 ? 'text-white font-black' : 'text-primary/50'}`}>{entry.nick}</span>
                            <span className={`font-bold text-sm shrink-0 tabular-nums ${idx === 0 ? 'text-primary text-glow' : 'text-primary/60'}`}>{entry.score}</span>
                        </div>
                    ))}
                    {(!list || list.length === 0) && <div className="text-primary/20 text-sm font-mono">BRAK_DANYCH</div>}
                </div>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen p-4 md:p-8 relative overflow-y-auto overflow-x-hidden flex flex-col custom-scrollbar">
            {/* Grid bg */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
                backgroundImage: 'linear-gradient(rgba(0,255,65,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,1) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
            }} />

            <button
                onClick={() => navigate('/dashboard')}
                className="mt-8 md:mt-0 mb-6 md:mb-8 flex items-center gap-2 text-primary/40 hover:text-primary transition-colors relative z-30 font-mono text-sm"
            >
                <ArrowLeft size={16} /> &gt; POWRÓT
            </button>

            <div className="flex flex-col justify-center items-center mb-10 text-center mt-4 w-full z-10 relative">
                <p className="text-primary/50 text-[10px] font-mono uppercase tracking-widest mb-2">&gt; SYSTEM_RANKING</p>
                <h1 className="text-3xl md:text-5xl font-mono font-bold text-white tracking-tighter mb-4 animate-flicker">
                    RANKING_OGÓLNY
                </h1>
                <div className="flex justify-center w-full mb-4">
                    <img src={sparkSomeLogo} alt="SparkSome Logo" className="h-8 sm:h-9 md:h-10 invert opacity-40" />
                </div>
                {data?.leaderboard_message && (
                    <div className="text-base md:text-xl font-bold font-mono text-accent px-6 py-3 border border-accent/40 bg-accent/[0.05] text-glow text-center shadow-[0_0_20px_rgba(204,255,0,0.15)]">
                        {data.leaderboard_message}
                    </div>
                )}
            </div>

            {/* Grandmaster Section */}
            <div className="mb-10 z-10 relative">
                <div className="crt-border bg-surface p-6 md:p-8 shadow-[0_0_60px_rgba(204,255,0,0.08)] relative overflow-hidden">
                    {/* Terminal titlebar */}
                    <div className="flex items-center gap-2 pb-4 mb-6 border-b border-accent/20">
                        <div className="w-2 h-2 bg-accent/60" />
                        <div className="w-2 h-2 bg-accent/30" />
                        <div className="w-2 h-2 bg-accent/30" />
                        <span className="text-accent/40 text-[10px] ml-2">grandmaster.sh</span>
                        <Trophy size={12} className="text-accent/40 ml-auto" />
                    </div>

                    <p className="text-accent/50 text-[10px] font-mono uppercase tracking-widest mb-1">&gt; TOP_SCORE</p>
                    <h3 className="text-xl md:text-2xl font-mono font-bold text-accent text-glow mb-8">ALL GAMES: GRANDMASTER</h3>

                    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
                        {/* 1st Place */}
                        {data?.grandmaster?.length > 0 && (
                            <div className="flex justify-center">
                                <div className="w-full max-w-2xl flex justify-between items-center font-mono border border-accent/50 bg-accent/[0.05] px-6 py-5 shadow-[0_0_30px_rgba(204,255,0,0.1)]">
                                    <div className="flex items-center gap-4 overflow-hidden">
                                        <span className="font-black text-accent text-glow-lg text-4xl md:text-5xl shrink-0 w-16">#1</span>
                                        <span className="font-bold text-2xl md:text-3xl text-white truncate">{data.grandmaster[0].nick}</span>
                                    </div>
                                    <span className="font-mono font-black text-primary text-glow tabular-nums text-xl md:text-2xl shrink-0 ml-4">{data.grandmaster[0].score}</span>
                                </div>
                            </div>
                        )}

                        {/* Remaining Places */}
                        {data?.grandmaster?.length > 1 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-2">
                                <div className="flex flex-col gap-2">
                                    {data.grandmaster.slice(1, Math.ceil((data.grandmaster.length - 1) / 2) + 1).map((entry: any, i: number) => {
                                        const idx = i + 1
                                        return (
                                            <div key={idx} className="flex justify-between items-center font-mono text-base md:text-lg border-b border-primary/[0.08] pb-2 px-3 py-2">
                                                <span className="text-white flex items-center gap-3">
                                                    <span className={`font-black w-12 ${idx === 1 ? 'text-primary/60 text-xl' : idx === 2 ? 'text-primary/40 text-xl' : 'text-primary/30'}`}>#{idx + 1}</span>
                                                    {entry.nick}
                                                </span>
                                                <span className="text-primary/60 font-black text-base md:text-lg tabular-nums">{entry.score}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="flex flex-col gap-2">
                                    {data.grandmaster.slice(Math.ceil((data.grandmaster.length - 1) / 2) + 1).map((entry: any, i: number) => {
                                        const idx = i + Math.ceil((data.grandmaster.length - 1) / 2) + 1
                                        return (
                                            <div key={idx} className="flex justify-between items-center font-mono text-base md:text-lg border-b border-primary/[0.08] pb-2 px-3 py-2">
                                                <span className="text-white flex items-center gap-3">
                                                    <span className="font-black w-12 text-primary/30">#{idx + 1}</span>
                                                    {entry.nick}
                                                </span>
                                                <span className="text-primary/60 font-black tabular-nums">{entry.score}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Game Sections */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 pb-10 z-10 relative">
                <Section title="BINARY BRAIN" list={data?.binary_brain} />
                <Section title="PATCH MASTER" list={data?.patch_master} />
                <Section title="IT MATCH" list={data?.it_match} />
                <Section title="TEXT MATCH" list={data?.text_match} />
            </div>
        </div>
    )
}
