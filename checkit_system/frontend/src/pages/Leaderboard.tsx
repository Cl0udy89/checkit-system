import { useQuery } from '@tanstack/react-query'
import { fetchLeaderboard } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trophy } from 'lucide-react'

export default function Leaderboard() {
    const navigate = useNavigate()
    const { data, isLoading } = useQuery({
        queryKey: ['leaderboard'],
        queryFn: fetchLeaderboard,
        refetchInterval: 5000 // Live updates
    })

    if (isLoading) return <div className="p-10 text-center animate-pulse font-mono">SYNCING_LEADERBOARD...</div>

    const Section = ({ title, list }: { title: string, list: any[] }) => (
        <div className="bg-surface border border-gray-700 rounded-lg p-4">
            <h3 className="text-xl font-mono font-bold text-primary mb-4 border-b border-gray-800 pb-2">{title}</h3>
            <div className="space-y-2">
                {list?.map((entry, idx) => (
                    <div key={idx} className="flex justify-between font-mono text-sm border-b border-gray-800/50 pb-1 last:border-0 hover:bg-white/5 px-2 py-1 rounded">
                        <span className="text-gray-300">#{idx + 1} {entry.nick}</span>
                        <span className="text-white font-bold">{entry.score}</span>
                    </div>
                ))}
                {(!list || list.length === 0) && <div className="text-gray-600 text-xs">NO_DATA</div>}
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-background p-8 relative overflow-y-auto">
            <button
                onClick={() => navigate('/dashboard')}
                className="mb-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
                <ArrowLeft size={20} /> BACK_TO_DASHBOARD
            </button>

            <h1 className="text-4xl font-mono font-bold text-white mb-8 text-center flex justify-center items-center gap-4">
                <Trophy className="text-accent" size={40} /> GLOBAL_LEADERBOARD
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Section title="BINARY_BRAIN" list={data?.binary_brain} />
                <Section title="PATCH_MASTER" list={data?.patch_master} />
                <Section title="IT_MATCH" list={data?.it_match} />

                <div className="bg-surface border-2 border-accent rounded-lg p-4 shadow-[0_0_30px_rgba(243,234,95,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 bg-accent/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                    <h3 className="text-xl font-mono font-bold text-accent mb-4 border-b border-accent/30 pb-2 relative z-10">GRANDMASTER</h3>
                    <div className="space-y-3 relative z-10">
                        {data?.grandmaster?.map((entry: any, idx: number) => (
                            <div key={idx} className="flex justify-between font-mono text-base border-b border-accent/20 pb-2 last:border-0 hover:bg-accent/10 px-2 py-1 rounded transition-colors">
                                <span className="text-gray-200">
                                    <span className="text-accent mr-2">#{idx + 1}</span>
                                    {entry.nick}
                                </span>
                                <span className="text-accent font-bold">{entry.score}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
