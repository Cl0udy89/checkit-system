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
        <div className="min-h-screen bg-background p-8 relative overflow-y-auto">
            <button
                onClick={() => navigate('/dashboard')}
                className="mb-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
                <ArrowLeft size={20} /> POWRÓT
            </button>

            <h1 className="text-5xl font-mono font-bold text-white mb-12 text-center flex justify-center items-center gap-4">
                <Trophy className="text-accent" size={56} /> GLOBALNY RANKING
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <Section title="BINARY BRAIN" list={data?.binary_brain} />
                <Section title="PATCH MASTER" list={data?.patch_master} />
                <Section title="IT MATCH" list={data?.it_match} />

                <div className="bg-surface border-4 border-accent rounded-xl p-6 shadow-[0_0_50px_rgba(243,234,95,0.2)] relative overflow-hidden transform scale-105">
                    <div className="absolute top-0 right-0 p-16 bg-accent/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                    <h3 className="text-3xl font-mono font-bold text-accent mb-6 border-b-2 border-accent/30 pb-2 relative z-10">MISTRZOWIE</h3>
                    <div className="space-y-4 relative z-10">
                        {data?.grandmaster?.map((entry: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center font-mono text-xl border-b border-accent/20 pb-2 last:border-0 hover:bg-accent/10 px-2 py-1 rounded transition-colors">
                                <span className="text-gray-100 flex items-center gap-3">
                                    <span className="text-accent font-black text-2xl">#{idx + 1}</span>
                                    {entry.nick}
                                </span>
                                <span className="text-accent font-black text-2xl">{entry.score}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
