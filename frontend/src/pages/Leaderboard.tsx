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
                        <span className="text-white font-bold text-xl">{entry.score}</span>
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

            <h1 className="text-5xl font-mono font-bold text-white mb-12 text-center flex justify-center items-center gap-4">
                <Trophy className="text-accent" size={56} /> GLOBALNY RANKING
            </h1>

            {/* Grandmaster Section - Full Width on Top */}
            <div className="mb-12">
                <div className="bg-surface border-4 border-accent rounded-xl p-8 shadow-[0_0_50px_rgba(243,234,95,0.2)] relative overflow-hidden transform hover:scale-[1.01] transition-transform">
                    <div className="absolute top-0 right-0 p-32 bg-accent/10 rounded-full blur-[100px] transform translate-x-1/2 -translate-y-1/2"></div>
                    <div className="relative z-10">
                        <h3 className="text-4xl font-mono font-bold text-accent mb-8 border-b-2 border-accent/30 pb-4 flex justify-between items-center">
                            <span>MISTRZOWIE (SUMA PUNKTÓW)</span>
                            <Trophy size={48} />
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                            {data?.grandmaster?.map((entry: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center font-mono text-2xl border-b border-accent/20 pb-2 hover:bg-accent/5 px-4 py-2 rounded transition-colors">
                                    <span className="text-gray-100 flex items-center gap-4">
                                        <span className={`font-black text-3xl w-12 ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-amber-700' : 'text-accent'}`}>#{idx + 1}</span>
                                        {entry.nick}
                                    </span>
                                    <span className="text-accent font-black text-3xl">{entry.score}</span>
                                </div>
                            ))}
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
