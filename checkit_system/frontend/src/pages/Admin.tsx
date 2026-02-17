import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../lib/api' // We need to add admin endpoints there or use raw axios
import { useNavigate } from 'react-router-dom'
import { Shield, Zap, RefreshCw, Lock } from 'lucide-react'

// Direct axios calls for admin to save time updating api.ts
const triggerSolenoid = async () => api.post('/admin/solenoid/trigger')
const fetchHardwareStatus = async () => (await api.get('/admin/hardware/status')).data

export default function Admin() {
    const navigate = useNavigate()

    const { data: status } = useQuery({
        queryKey: ['admin_hardware'],
        queryFn: fetchHardwareStatus,
        refetchInterval: 2000
    })

    const solenoidMutation = useMutation({
        mutationFn: triggerSolenoid,
        onSuccess: () => alert("Solenoid Triggered")
    })

    return (
        <div className="min-h-screen bg-black text-green-500 font-mono p-8 border-4 border-green-900">
            <header className="flex justify-between items-center mb-12 border-b border-green-800 pb-4">
                <h1 className="text-3xl font-bold flex items-center gap-4">
                    <Shield /> ADMIN_CONSOLE // ROOT_ACCESS
                </h1>
                <button onClick={() => navigate('/dashboard')} className="hover:text-white">EXIT</button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Solenoid Control */}
                <div className="border border-green-800 p-6 bg-green-900/10">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Lock /> RELAY_CONTROL</h2>
                    <p className="mb-4 text-sm text-green-400">Manual override for solenoid lock.</p>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => solenoidMutation.mutate()}
                            className="bg-red-900 text-white px-6 py-4 font-bold rounded hover:bg-red-700 transition w-full flex justify-center items-center gap-2"
                        >
                            <Zap /> FORCE OPEN (5s)
                        </button>
                        <div className="text-center">
                            STATUS: <span className={status?.solenoid?.is_active ? "text-red-500 animate-pulse" : "text-green-500"}>
                                {status?.solenoid?.is_active ? "ACTIVE" : "IDLE"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* GPIO Status */}
                <div className="border border-green-800 p-6 bg-green-900/10">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><RefreshCw /> BRIDGE_STATUS</h2>
                    <div className="grid grid-cols-4 gap-2">
                        {status?.patch_panel?.pairs?.map((p: any, idx: number) => (
                            <div key={idx} className={`text-center p-2 border ${p.connected ? 'bg-green-500 text-black border-green-500' : 'border-red-900 text-red-900'}`}>
                                {idx + 1}: {p.connected ? 'OK' : 'ERR'}
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 text-center font-bold">
                        SOLVED: {status?.patch_panel?.solved ? "YES" : "NO"}
                    </div>
                </div>
            </div>
        </div>
    )
}
