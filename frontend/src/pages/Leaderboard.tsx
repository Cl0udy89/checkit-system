import { useQuery } from '@tanstack/react-query'
import { fetchLeaderboard } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
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

    if (isLoading) return <div className="p-10 text-center animate-pulse font-mono text-2xl">SYNCHRONIZACJA WYNIKÓW...</div>

    const Section = ({ title, list }: { title: string, list: any[] }) => (
        <div className="bg-surface border border-gray-700 rounded-lg p-6 shadow-lg h-full flex flex-col">
            <h3 className="text-2xl font-mono font-bold text-primary mb-6 border-b border-gray-800 pb-2 shrink-0">{title}</h3>
            <div className="grid grid-cols-[2.5rem_1fr_auto] text-xs text-gray-500 font-mono mb-2 px-2 shrink-0">
                <span>POS</span>
                <span>NICK</span>
                <span>PUNKTY</span>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar h-[300px]">
                <div className="space-y-3">
                    {list?.map((entry, idx) => (
                        <div key={idx} className="grid grid-cols-[2.5rem_1fr_auto] items-center font-mono text-base border-b border-gray-800/50 pb-2 last:border-0 hover:bg-white/5 px-2 py-1 rounded">
                            <span className={`font-bold shrink-0 ${idx < 3 ? 'text-accent' : 'text-gray-500'}`}>#{idx + 1}</span>
                            <span className="truncate pr-2 text-gray-300">{entry.nick}</span>
                            <span className="text-white font-bold text-lg shrink-0">{entry.score}</span>
                        </div>
                    ))}
                    {(!list || list.length === 0) && <div className="text-gray-600 text-sm">BRAK DANYCH</div>}
                </div>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-transparent p-4 md:p-8 relative overflow-y-auto overflow-x-hidden flex flex-col custom-scrollbar">
            {/* Desktop Absolute Logo */}
            <div className="hidden md:flex absolute top-8 right-8 z-20 flex-col items-end gap-2">
                <img src={sparkSomeLogo} alt="SparkSome Logo" className="h-24 invert" />
            </div>

            <button
                onClick={() => navigate('/dashboard')}
                className="mt-8 md:mt-0 mb-6 md:mb-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors relative z-30"
            >
                <ArrowLeft size={20} /> POWRÓT
            </button>

            <div className="flex flex-col justify-center items-center mb-12 text-center mt-4 w-full">
                {/* Mobile Flow Logo */}
                <div className="md:hidden flex justify-center w-full mb-6">
                    <img src={sparkSomeLogo} alt="SparkSome Logo" className="h-20 invert opacity-90" />
                </div>

                <h1 className="text-4xl md:text-6xl font-mono font-bold text-white tracking-tighter mb-4 md:mb-6">
                    RANKING OGÓLNY
                </h1>
                {data?.leaderboard_message && (
                    <div className="text-lg md:text-2xl font-bold font-mono text-accent px-6 py-3 bg-accent/20 border-2 border-accent rounded-xl backdrop-blur-md shadow-[0_0_20px_rgba(243,234,95,0.6)] text-center">
                        {data.leaderboard_message}
                    </div>
                )}
            </div>

            {/* Grandmaster Section - Full Width on Top */}
            <div className="mb-12">
                <div className="bg-surface border-4 border-accent rounded-xl p-6 md:p-8 shadow-[0_0_50px_rgba(243,234,95,0.2)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-accent/10 rounded-full blur-[100px] transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                    <div className="relative z-10">
                        <h3 className="text-2xl md:text-3xl font-mono font-bold text-accent mb-6 border-b-2 border-accent/30 pb-4">
                            TOP SCORE: ALL GAMES
                        </h3>
                        <div className="grid grid-cols-[2.5rem_1fr_auto] text-xs text-gray-500 font-mono mb-2 px-2">
                            <span>POS</span>
                            <span>NICK</span>
                            <span>PUNKTY</span>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                            {data?.grandmaster?.map((entry: any, idx: number) => (
                                <div key={idx} className={`grid grid-cols-[2.5rem_1fr_auto] items-center font-mono border-b border-accent/20 pb-2 px-2 py-2 rounded hover:bg-accent/5 transition-colors ${idx === 0 ? 'bg-yellow-400/5 border-yellow-400/30' : ''}`}>
                                    <span className={`font-black shrink-0 text-xl md:text-2xl ${
                                        idx === 0 ? 'text-yellow-400' :
                                        idx === 1 ? 'text-gray-400' :
                                        idx === 2 ? 'text-amber-700' :
                                        'text-accent'
                                    }`}>#{idx + 1}</span>
                                    <span className={`truncate pr-2 font-bold text-base md:text-xl ${idx === 0 ? 'text-white' : 'text-gray-100'}`}>{entry.nick}</span>
                                    <span className={`font-black text-base md:text-2xl shrink-0 ${idx === 0 ? 'text-accent' : 'text-accent/80'}`}>{entry.score}</span>
                                </div>
                            ))}
                            {(!data?.grandmaster || data.grandmaster.length === 0) && (
                                <div className="text-gray-600 text-sm font-mono">BRAK DANYCH</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Game Sections - 3 Columns Below */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10">
                <Section title="BINARY BRAIN" list={data?.binary_brain} />
                <Section title="PATCH MASTER" list={data?.patch_master} />
                <Section title="IT MATCH" list={data?.it_match} />
            </div>
        </div>

    )
}
