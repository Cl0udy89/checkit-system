import { useQuery } from '@tanstack/react-query'
import { fetchLeaderboard } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trophy } from 'lucide-react'
import { useEffect } from 'react'

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

    if (isLoading) return <div className="p-10 text-center animate-pulse font-mono text-2xl">SYNCHRONIZACJA WYNIKÓW...</div>

    const Section = ({ title, list }: { title: string, list: any[] }) => (
        <div className="bg-surface border border-gray-700 rounded-lg p-6 shadow-lg">
            <h3 className="text-2xl font-mono font-bold text-primary mb-6 border-b border-gray-800 pb-2">{title}</h3>
            <div className="space-y-3">
                {list?.map((entry, idx) => (
                    <div key={idx} className="flex justify-between items-center font-mono text-lg border-b border-gray-800/50 pb-2 last:border-0 hover:bg-white/5 px-2 py-1 rounded">
                        <span className="text-gray-300 flex items-center gap-2">
                            <span className={`font-bold ${idx < 3 ? 'text-accent' : 'text-gray-500'}`}>#{idx + 1}</span>
                            {entry.nick}
                        </span>
                        <span className="text-white font-bold text-xl">{entry.score} PTS</span>
                    </div>
                ))}
                {(!list || list.length === 0) && <div className="text-gray-600 text-sm">BRAK DANYCH</div>}
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-transparent p-8 relative overflow-y-auto">
            <button
                onClick={() => navigate('/dashboard')}
                className="mb-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
                <ArrowLeft size={20} /> POWRÓT
            </button>

            <h1 className="text-4xl font-mono font-bold text-white mb-12 text-center flex justify-center items-center gap-4">
                <Trophy className="text-accent" size={48} /> GLOBALNY RANKING
            </h1>

            {/* Grandmaster Section - Full Width on Top */}
            <div className="mb-12">
                <div className="bg-surface border-4 border-accent rounded-xl p-8 shadow-[0_0_50px_rgba(243,234,95,0.2)] relative overflow-hidden transform hover:scale-[1.01] transition-transform">
                    <div className="absolute top-0 right-0 p-32 bg-accent/10 rounded-full blur-[100px] transform translate-x-1/2 -translate-y-1/2"></div>
                    <div className="relative z-10">
                        <h3 className="text-3xl font-mono font-bold text-accent mb-8 border-b-2 border-accent/30 pb-4 flex justify-between items-center">
                            <span>MISTRZOWIE (SUMA PUNKTÓW)</span>
                            <Trophy size={40} />
                        </h3>
                        <div className="flex flex-col gap-8 max-w-5xl mx-auto">
                            {/* 1st Place */}
                            {data?.grandmaster?.length > 0 && (
                                <div className="flex justify-center">
                                    <div className="w-full max-w-2xl flex justify-between items-center font-mono border-2 border-yellow-400/50 shadow-[0_0_30px_rgba(255,215,0,0.3)] bg-yellow-400/10 pb-2 px-6 py-4 rounded transition-colors hover:bg-accent/10">
                                        <span className="text-gray-100 flex items-center gap-4">
                                            <span className="font-black text-yellow-400 text-5xl w-20">#1</span>
                                            <span className="font-bold text-3xl md:text-4xl">{data.grandmaster[0].nick}</span>
                                        </span>
                                        <span className="text-yellow-400 font-black text-3xl md:text-4xl">{data.grandmaster[0].score} PTS</span>
                                    </div>
                                </div>
                            )}

                            {/* Remaining Places in 2 Columns */}
                            {data?.grandmaster?.length > 1 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                                    {/* Left Column */}
                                    <div className="flex flex-col gap-4">
                                        {data.grandmaster.slice(1, Math.ceil((data.grandmaster.length - 1) / 2) + 1).map((entry: any, i: number) => {
                                            const idx = i + 1; // 1-indexed for the slice
                                            return (
                                                <div key={idx} className="flex justify-between items-center font-mono text-xl md:text-2xl border-b border-accent/20 pb-2 px-4 py-3 rounded transition-colors hover:bg-accent/10">
                                                    <span className="text-gray-100 flex items-center gap-4">
                                                        <span className={`font-black w-16 ${idx === 1 ? 'text-gray-400 text-3xl' : idx === 2 ? 'text-amber-700 text-3xl' : 'text-accent text-3xl'}`}>#{idx + 1}</span>
                                                        {entry.nick}
                                                    </span>
                                                    <span className="text-accent font-black text-2xl md:text-3xl">{entry.score} PTS</span>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Right Column */}
                                    <div className="flex flex-col gap-4">
                                        {data.grandmaster.slice(Math.ceil((data.grandmaster.length - 1) / 2) + 1).map((entry: any, i: number) => {
                                            const idx = i + Math.ceil((data.grandmaster.length - 1) / 2) + 1; // 1-indexed for the slice
                                            return (
                                                <div key={idx} className="flex justify-between items-center font-mono text-xl md:text-2xl border-b border-accent/20 pb-2 px-4 py-3 rounded transition-colors hover:bg-accent/10">
                                                    <span className="text-gray-100 flex items-center gap-4">
                                                        <span className={`font-black w-16 ${idx === 1 ? 'text-gray-400 text-3xl' : idx === 2 ? 'text-amber-700 text-3xl' : 'text-accent text-3xl'}`}>#{idx + 1}</span>
                                                        {entry.nick}
                                                    </span>
                                                    <span className="text-accent font-black text-2xl md:text-3xl">{entry.score} PTS</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Game Sections - 3 Columns Below */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-20">
                <Section title="BINARY BRAIN" list={data?.binary_brain} />
                <Section title="PATCH MASTER" list={data?.patch_master} />
                <Section title="IT MATCH" list={data?.it_match} />
            </div>
        </div>

    )
}
