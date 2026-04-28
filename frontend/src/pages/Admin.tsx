import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, fetchAdminUsers, fetchAdminScores, deleteUser, fetchSystemConfig, setSystemConfig, fetchEmailTemplates, updateEmailTemplate, sendAllEmails, clearLogs, resetDatabase, fetchPMQueue, adminPMQueueNext, adminPMQueueSetStatus, adminPMQueueKick, fetchUserScores, deleteUserScore } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { Shield, Zap, RefreshCw, Lock, LogOut, Settings, Mail, X, ZoomIn } from 'lucide-react'
import AdminLogin from './AdminLogin'
import React, { useState, useEffect } from 'react'

// ── Screenshot viewer with metadata ──────────────────────────
function ScreenshotViewer({ b64, name, onClose }: { b64: string; name: string; onClose: () => void }) {
    const [dims, setDims] = useState<{ w: number; h: number } | null>(null)
    const src = `data:image/*;base64,${b64}`
    const sizeKb = Math.round((b64.length * 3) / 4 / 1024)

    useEffect(() => {
        const img = new window.Image()
        img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight })
        img.src = src
    }, [src])

    return (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface crt-border max-w-4xl w-full max-h-[90vh] flex flex-col md:flex-row overflow-hidden" onClick={e => e.stopPropagation()}>

                {/* Title bar */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-primary/20 bg-primary/[0.03] md:hidden">
                    <span className="text-primary/40 text-[10px] font-mono flex-1">screenshot_viewer.sh</span>
                    <button onClick={onClose} className="text-primary/40 hover:text-primary transition-colors"><X size={14} /></button>
                </div>

                {/* Image panel */}
                <div className="flex-1 min-h-0 flex items-center justify-center bg-black/60 p-3 relative">
                    <img src={src} alt={name} className="max-w-full max-h-[60vh] md:max-h-[85vh] object-contain" />
                    <button onClick={onClose} className="absolute top-2 right-2 hidden md:flex bg-black/80 border border-primary/30 text-primary/60 hover:text-primary p-1 transition-colors">
                        <X size={14} />
                    </button>
                </div>

                {/* Metadata panel */}
                <div className="w-full md:w-64 shrink-0 border-t md:border-t-0 md:border-l border-primary/20 p-4 space-y-4 overflow-y-auto custom-scrollbar">
                    <p className="text-primary/50 text-[10px] font-mono uppercase tracking-widest border-b border-primary/10 pb-2">
                        &gt; METADANE
                    </p>

                    {[
                        { label: 'NAZWA PLIKU', value: name },
                        { label: 'ROZMIAR', value: `${sizeKb} KB` },
                        { label: 'WYMIARY', value: dims ? `${dims.w} × ${dims.h} px` : '...' },
                        { label: 'FORMAT', value: name.split('.').pop()?.toUpperCase() ?? 'N/A' },
                        { label: 'ASPECT RATIO', value: dims ? (dims.w / dims.h).toFixed(2) + ':1' : '...' },
                        { label: 'MEGAPIKSELE', value: dims ? ((dims.w * dims.h) / 1_000_000).toFixed(2) + ' MP' : '...' },
                        { label: 'ORIENTACJA', value: dims ? (dims.w > dims.h ? 'POZIOMA' : dims.w < dims.h ? 'PIONOWA' : 'KWADRAT') : '...' },
                    ].map(({ label, value }) => (
                        <div key={label}>
                            <p className="text-primary/30 text-[9px] font-mono uppercase tracking-wider">{label}</p>
                            <p className="text-primary text-xs font-mono mt-0.5 break-all">{value}</p>
                        </div>
                    ))}

                    <div>
                        <p className="text-primary/30 text-[9px] font-mono uppercase tracking-wider">BASE64 DŁUGOŚĆ</p>
                        <p className="text-primary/60 text-[10px] font-mono mt-0.5">{b64.length.toLocaleString()} znaków</p>
                    </div>
                    <div>
                        <p className="text-primary/30 text-[9px] font-mono uppercase tracking-wider">STATUS</p>
                        <p className="text-secondary text-[10px] font-mono mt-0.5">VERIFIED_UPLOAD ✓</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Direct axios calls for admin to save time updating api.ts
const triggerSolenoid = async () => api.post('/admin/solenoid/trigger')
const triggerLed = async (effect: string) => api.post('/admin/hardware/led', { effect })
const fetchHardwareStatus = async () => (await api.get('/admin/hardware/status')).data

export default function Admin() {
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const token = localStorage.getItem('admin_token')
    const [activeTab, setActiveTab] = useState<'hardware' | 'users' | 'scores' | 'logs' | 'settings' | 'email'>('hardware')
    const [emailSuccess, setEmailSuccess] = useState('')
    const [expandedUser, setExpandedUser] = useState<number | null>(null)
    const [customColor, setCustomColor] = useState<string>('#00ff00')
    const [viewingScreenshot, setViewingScreenshot] = useState<{ b64: string; name: string } | null>(null)

    if (!token) return <AdminLogin />

    const { data: status } = useQuery({
        queryKey: ['admin_hardware'],
        queryFn: fetchHardwareStatus,
        refetchInterval: 2000,
        enabled: activeTab === 'hardware'
    })

    const { data: users } = useQuery({
        queryKey: ['admin_users'],
        queryFn: fetchAdminUsers,
        enabled: activeTab === 'users'
    })

    const { data: userScores, refetch: refetchUserScores } = useQuery({
        queryKey: ['admin_user_scores', expandedUser],
        queryFn: () => fetchUserScores(expandedUser!),
        enabled: activeTab === 'users' && expandedUser !== null
    })

    const { data: scores } = useQuery({
        queryKey: ['admin_scores'],
        queryFn: fetchAdminScores,
        enabled: activeTab === 'scores'
    })

    const { data: logs } = useQuery({
        queryKey: ['admin_logs'],
        queryFn: async () => (await api.get('/admin/logs')).data,
        refetchInterval: 3000,
        enabled: activeTab === 'logs'
    })

    const { data: systemStatus } = useQuery({
        queryKey: ['system_status'],
        queryFn: async () => (await api.get('/admin/system/status')).data,
        refetchInterval: 5000 // Refresh often to see new nodes
    })

    const { data: config, refetch: refetchConfig } = useQuery({
        queryKey: ['admin_config'],
        queryFn: fetchSystemConfig,
        enabled: activeTab === 'settings'
    })

    const { data: templates, refetch: refetchTemplates } = useQuery({
        queryKey: ['admin_templates'],
        queryFn: fetchEmailTemplates,
        enabled: activeTab === 'email'
    })

    // Mutations
    const configMutation = useMutation({
        mutationFn: ({ key, value }: { key: string, value: string }) => setSystemConfig(key, value),
        onSuccess: () => refetchConfig()
    })

    // We can use local state for editing templates, simplistic approach here
    const [editingTemplate, setEditingTemplate] = useState<{ slug: string, subject: string, body: string } | null>(null)

    const updateTemplateMutation = useMutation({
        mutationFn: () => updateEmailTemplate(editingTemplate!.slug, editingTemplate!.subject, editingTemplate!.body),
        onSuccess: () => {
            setEditingTemplate(null)
            refetchTemplates()
        }
    })

    const sendEmailsMutation = useMutation({
        mutationFn: sendAllEmails,
        onSuccess: (data: any) => {
            setEmailSuccess(`Emails Queued: ${data.count} (Winners: ${data.winner_count})`)
            setTimeout(() => setEmailSuccess(''), 5000)
        }
    })

    const clearLogsMutation = useMutation({
        mutationFn: clearLogs,
        onSuccess: () => {
            alert("Logi wyczyszczone")
            window.location.reload()
        }
    })

    const resetDbMutation = useMutation({
        mutationFn: resetDatabase,
        onSuccess: () => {
            alert("BAZA DANYCH ZRESETOWANA.")
            window.location.reload()
        }
    })

    const solenoidMutation = useMutation({
        mutationFn: triggerSolenoid,
        onSuccess: () => alert("Solenoid Triggered")
    })

    const ledMutation = useMutation({
        mutationFn: triggerLed,
        onSuccess: (_, variables) => alert(`LED Effect Queued: ${variables}`)
    })

    // Queue State
    const { data: queueState, refetch: refetchQueue } = useQuery({
        queryKey: ['admin_pm_queue'],
        queryFn: fetchPMQueue,
        refetchInterval: 1500,
        enabled: activeTab === 'hardware'
    })
    const nextPlayerMutation = useMutation({ mutationFn: adminPMQueueNext, onSuccess: () => refetchQueue() })
    const setQueueStatusMutation = useMutation({ mutationFn: adminPMQueueSetStatus, onSuccess: () => refetchQueue() })
    const kickPlayerMutation = useMutation({ mutationFn: adminPMQueueKick, onSuccess: () => refetchQueue() })

    const forceSolveMutation = useMutation({
        mutationFn: async () => api.post('/game/patch-master/queue/admin/force_solve'),
        onSuccess: () => refetchQueue()
    })

    const forcePatchPanelMutation = useMutation({
        mutationFn: async ({ index, state }: { index: number, state: boolean }) => api.post(`/admin/hardware/patch_panel/force/${index}?state=${state}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin_hardware'] })
    })

    const clearPatchPanelMutation = useMutation({
        mutationFn: async () => api.delete('/admin/hardware/patch_panel/force'),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin_hardware'] })
    })

    const clearIndividualPatchPanelMutation = useMutation({
        mutationFn: async (index: number) => api.delete(`/admin/hardware/patch_panel/force/${index}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin_hardware'] })
    })

    return (
        <div className="min-h-screen bg-black text-green-500 font-mono p-4 md:p-8 border-x-0 md:border-4 border-green-900 overflow-x-hidden">
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-green-800 pb-4 gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-center md:text-left">
                        <Shield /> ADMIN_CONSOLE // ROOT_ACCESS
                    </h1>
                    {/* Connected Nodes Indicator */}
                    <div className="flex gap-2 ml-4 hidden md:flex">
                        {systemStatus?.connected_nodes && Object.values(systemStatus.connected_nodes).length > 0 ? (
                            Object.values(systemStatus.connected_nodes).map((node: any, idx) => {
                                const isOnline = node.status === 'online';
                                return (
                                    <div key={idx} className={`px-2 py-1 border text-xs rounded font-mono flex items-center gap-2 ${isOnline ? 'bg-green-900/50 border-green-500 text-green-400' : 'bg-gray-900/50 border-gray-600 text-gray-500'}`}>
                                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                        {node.is_rpi ? "RPi" : "PC"} [{node.node_id}]
                                    </div>
                                )
                            })
                        ) : (
                            <div className="px-2 py-1 bg-yellow-900/50 border border-yellow-500 text-yellow-500 text-xs rounded font-mono flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                NO NODES
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => { localStorage.removeItem('admin_token'); window.location.reload() }} className="hover:text-red-500 flex items-center gap-2"><LogOut size={16} /> WYLOGUJ</button>
                    <button onClick={() => navigate('/dashboard')} className="hover:text-white">WYJŚCIE</button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 w-full no-scrollbar">
                <button onClick={() => setActiveTab('hardware')} className={`whitespace-nowrap px-3 py-2 text-sm border ${activeTab === 'hardware' ? 'bg-green-900/30 border-green-500 text-white' : 'border-green-900 text-green-700'}`}>SPRZĘT</button>
                <button onClick={() => setActiveTab('users')} className={`whitespace-nowrap px-3 py-2 text-sm border ${activeTab === 'users' ? 'bg-green-900/30 border-green-500 text-white' : 'border-green-900 text-green-700'}`}>UŻYTKOWNICY</button>
                <button onClick={() => setActiveTab('scores')} className={`whitespace-nowrap px-3 py-2 text-sm border ${activeTab === 'scores' ? 'bg-green-900/30 border-green-500 text-white' : 'border-green-900 text-green-700'}`}>WYNIKI</button>
                <button onClick={() => setActiveTab('logs')} className={`whitespace-nowrap px-3 py-2 text-sm border ${activeTab === 'logs' ? 'bg-green-900/30 border-green-500 text-white' : 'border-green-900 text-green-700'}`}>LOGI</button>
                <button onClick={() => setActiveTab('settings')} className={`whitespace-nowrap px-3 py-2 text-sm border ${activeTab === 'settings' ? 'bg-green-900/30 border-green-500 text-white' : 'border-green-900 text-green-700'}`}>USTAWIENIA</button>
                <button onClick={() => setActiveTab('email')} className={`whitespace-nowrap px-3 py-2 text-sm border ${activeTab === 'email' ? 'bg-green-900/30 border-green-500 text-white' : 'border-green-900 text-green-700'}`}>EMAIL</button>
            </div>

            {activeTab === 'hardware' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Solenoid Control */}
                    <div className="border border-green-800 p-6 bg-green-900/10">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Lock /> RELAY_CONTROL</h2>
                        <p className="mb-4 text-sm text-green-400">Manual override for solenoid lock.</p>

                        <div className="flex flex-col gap-4">
                            <button
                                onClick={() => solenoidMutation.mutate()}
                                className="bg-red-900 text-white px-6 py-4 font-bold rounded hover:bg-red-700 transition w-full flex justify-center items-center gap-2"
                            >
                                <Zap /> FORCE OPEN (5s)
                            </button>

                            <div className="flex justify-between items-center border border-green-800 p-3 bg-black">
                                <div className="text-center w-1/2 border-r border-green-800">
                                    <div className="text-xs text-gray-500 mb-1">KOMENDA</div>
                                    <span className={`font-bold ${status?.solenoid?.is_active ? "text-red-500 animate-pulse" : "text-green-500"}`}>
                                        {status?.solenoid?.is_active ? "ACTIVE" : "IDLE"}
                                    </span>
                                </div>
                                <div className="text-center w-1/2">
                                    <div className="text-xs text-gray-500 mb-1">CZUJNIK FIZYCZNY</div>
                                    <span className={`font-bold flex items-center justify-center gap-2 ${status?.solenoid?.is_open ? "text-yellow-500" : "text-green-500"}`}>
                                        {status?.solenoid?.is_open ? (
                                            <>🔓 OTWARTE</>
                                        ) : (
                                            <>🔒 ZAMKNIĘTE</>
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* GPIO Status */}
                    <div className="border border-green-800 p-6 bg-green-900/10">
                        <h2 className="text-xl font-bold mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2"><RefreshCw /> BRIDGE_STATUS</div>
                            <div className="flex gap-2 text-sm">
                                <button
                                    onClick={() => {
                                        for (let i = 0; i < 8; i++) forcePatchPanelMutation.mutate({ index: i, state: true })
                                    }}
                                    className="bg-green-700 hover:bg-green-600 px-3 py-1 rounded transition-colors"
                                >
                                    ROZWIĄŻ
                                </button>
                                <button
                                    onClick={() => clearPatchPanelMutation.mutate()}
                                    className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition-colors"
                                >
                                    WYŻERUJ
                                </button>
                            </div>
                        </h2>
                        <div className="grid grid-cols-4 gap-2">
                            {status?.patch_panel?.pairs?.map((p: any, idx: number) => (
                                <button
                                    key={idx}
                                    onClick={() => p.forced
                                        ? clearIndividualPatchPanelMutation.mutate(idx)
                                        : forcePatchPanelMutation.mutate({ index: idx, state: !p.connected })}
                                    className={`text-center p-2 border transition-colors cursor-pointer ${p.forced
                                        ? 'bg-green-500 text-black border-green-500 font-bold'
                                        : p.connected
                                            ? 'bg-green-900/50 text-green-400 border-green-500'
                                            : 'bg-red-900/20 border-red-900 text-red-700'
                                        }`}
                                >
                                    {idx + 1}: {p.forced ? 'FORCE' : p.connected ? 'OK' : 'ERR'}
                                </button>
                            ))}
                        </div>
                        <div className="mt-4 text-center font-bold">
                            SOLVED: {status?.patch_panel?.solved ? "YES" : "NO"}
                        </div>
                    </div>

                    {/* Patch Master Queue */}
                    <div className="border border-green-800 p-6 bg-green-900/10 md:col-span-2">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Zap /> PATCH_MASTER QUEUE</h2>

                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="flex-1">
                                <div className="mb-4">
                                    <span className="text-xs text-gray-500 block mb-1">STATUS KOLEJKI</span>
                                    <span className="font-bold text-lg text-white uppercase">{queueState?.status || 'Brak danych'}</span>
                                </div>
                                <div className="mb-4">
                                    <span className="text-xs text-gray-500 block mb-1">AKTUALNY GRACZ</span>
                                    <span className="font-bold text-xl text-accent">{queueState?.current_player?.nick || 'BRAK'}</span>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        onClick={() => nextPlayerMutation.mutate()}
                                        className="bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors"
                                    >
                                        ZAPROŚ KOLEJNEGO
                                    </button>
                                    <button
                                        onClick={() => setQueueStatusMutation.mutate('resetting')}
                                        className="bg-yellow-700 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded transition-colors"
                                    >
                                        TRYB PRZERWY
                                    </button>
                                    <button
                                        onClick={() => forceSolveMutation.mutate()}
                                        className="bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors"
                                        title="Wymusza wygraną dla aktualnie grającej osoby (awaria sprzętu z kablami)"
                                    >
                                        WYMUŚ ZALICZENIE
                                    </button>
                                    <button
                                        onClick={() => setQueueStatusMutation.mutate('available')}
                                        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
                                    >
                                        RESETUJ STAN
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 border border-green-800 bg-black p-4 max-h-64 overflow-y-auto">
                                <h3 className="text-sm font-bold text-green-500 mb-2 border-b border-green-800 pb-2">LISTA OCZEKUJĄCYCH ({queueState?.queue?.length || 0})</h3>
                                {queueState?.queue?.length === 0 ? (
                                    <div className="text-gray-500 text-xs text-center mt-4">Kolejka jest pusta.</div>
                                ) : (
                                    <ul className="space-y-2">
                                        {queueState?.queue?.map((u: any, idx: number) => (
                                            <li key={u.id} className="flex justify-between items-center bg-gray-900/50 p-2">
                                                <span className="text-white font-mono">{idx + 1}. {u.nick}</span>
                                                <button
                                                    onClick={() => kickPlayerMutation.mutate(u.id)}
                                                    className="text-xs text-red-500 hover:text-red-400 border border-red-900 px-2 py-1 rounded"
                                                >
                                                    WYRZUĆ
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* LED Control */}
                    <div className="border border-green-800 p-6 bg-green-900/10 md:col-span-2">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2"><Zap /> LED_CONTROL</h2>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 hidden md:inline">DOWOLNY KOLOR:</span>
                                {/* By setting a background with border rounded tight, the color input fits nicer. Some browsers stylize it weirdly anyway */}
                                <input
                                    type="color"
                                    value={customColor}
                                    onChange={(e) => setCustomColor(e.target.value)}
                                    className="w-10 h-10 cursor-pointer bg-black p-1 transition-all border border-green-800"
                                    title="Wybierz z palety kolorów"
                                />
                                <button
                                    onClick={() => ledMutation.mutate(customColor)}
                                    className="bg-green-700 hover:bg-green-600 text-white font-bold py-1 px-3 rounded text-sm transition-colors"
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                        <p className="mb-4 text-sm text-green-400">Manual override for Neopixel Strip. Wybierz kolor obok i zatwierdź "OK", lub uruchom gotowy efekt poniżej.</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                            <button onClick={() => ledMutation.mutate('rainbow')} className={`bg-purple-900 text-white p-2 text-sm hover:bg-purple-700 transition ${status?.led?.current_effect === 'rainbow' ? 'border-2 border-white font-bold shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border border-purple-500'}`}>RAINBOW</button>
                            <button onClick={() => ledMutation.mutate('chase')} className={`bg-blue-900 text-white p-2 text-sm hover:bg-blue-700 transition ${status?.led?.current_effect === 'chase' ? 'border-2 border-white font-bold shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border border-blue-500'}`}>CHASE</button>
                            <button onClick={() => ledMutation.mutate('police')} className={`bg-red-900 text-white p-2 text-sm hover:bg-red-700 transition ${status?.led?.current_effect === 'police' ? 'border-2 border-white font-bold shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border border-blue-500'}`}>POLICE</button>
                            <button onClick={() => ledMutation.mutate('green')} className={`bg-green-900 text-white p-2 text-sm hover:bg-green-700 transition ${status?.led?.current_effect === 'green' ? 'border-2 border-white font-bold shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border border-green-500'}`}>SOLID GREEN</button>
                            <button onClick={() => ledMutation.mutate('red')} className={`bg-red-900 text-white p-2 text-sm hover:bg-red-700 transition ${status?.led?.current_effect === 'red' ? 'border-2 border-white font-bold shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border border-red-500'}`}>SOLID RED</button>
                            <button onClick={() => ledMutation.mutate('off')} className={`bg-gray-900 text-white p-2 text-sm hover:bg-gray-700 transition ${status?.led?.current_effect === 'off' ? 'border-2 border-white font-bold shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border border-gray-500'}`}>TURN OFF</button>
                        </div>
                    </div>
                </div>
            )}

            {viewingScreenshot && (
                <ScreenshotViewer
                    b64={viewingScreenshot.b64}
                    name={viewingScreenshot.name}
                    onClose={() => setViewingScreenshot(null)}
                />
            )}

            {activeTab === 'users' && (
                <div className="overflow-x-auto border border-green-800">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-green-900/20 text-green-400">
                            <tr>
                                <th className="p-3">ID</th>
                                <th className="p-3">NICK</th>
                                <th className="p-3">EMAIL</th>
                                <th className="p-3">NEWSLETTER</th>
                                <th className="p-3">UTWORZONO</th>
                                <th className="p-3">SCREEN</th>
                                <th className="p-3">AKCJA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users?.map((u: any) => (
                                <React.Fragment key={u.id}>
                                    <tr
                                        onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                                        className="border-b border-green-900 hover:bg-green-900/10 cursor-pointer transition-colors"
                                    >
                                        <td className="p-3">{u.id}</td>
                                        <td className="p-3 font-bold text-white max-w-[150px] truncate">{u.nick}</td>
                                        <td className="p-3 text-gray-400 max-w-[200px] truncate">{u.email}</td>
                                        <td className="p-3 text-center">
                                            {u.agree_newsletter ? (
                                                <span className="text-green-400 font-bold">TAK</span>
                                            ) : (
                                                <span className="text-gray-600">NIE</span>
                                            )}
                                        </td>
                                        <td className="p-3">{new Date(u.created_at).toLocaleDateString()}</td>
                                        <td className="p-3">
                                            {u.screenshot_b64 ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setViewingScreenshot({ b64: u.screenshot_b64, name: u.screenshot_name || 'screenshot.png' })
                                                    }}
                                                    className="flex items-center gap-1 bg-green-900/30 hover:bg-green-900/60 text-green-400 hover:text-white px-2 py-1 text-xs border border-green-800 transition-colors"
                                                    title="Podgląd screenshota"
                                                >
                                                    <ZoomIn size={12} />
                                                    VIEW
                                                </button>
                                            ) : (
                                                <span className="text-gray-700 text-xs font-mono">—</span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation()
                                                    if (confirm(`Czy na pewno chcesz usunąć użytkownika ${u.nick}? To usunie również jego wyniki.`)) {
                                                        try {
                                                            await deleteUser(u.id)
                                                            alert("Użytkownik usunięty")
                                                            window.location.reload()
                                                        } catch (e) {
                                                            alert("Błąd usuwania")
                                                        }
                                                    }
                                                }}
                                                className="bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white px-2 py-1 rounded text-xs border border-red-800 transition-colors"
                                            >
                                                USUŃ
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedUser === u.id && (
                                        <tr className="bg-black/40 border-b border-green-900/50">
                                            <td colSpan={5} className="p-4">
                                                <div className="flex flex-col gap-2">
                                                    <h4 className="text-green-400 font-bold mb-2 text-xs uppercase tracking-wider">ROZGRANE MODUŁY:</h4>
                                                    {!userScores || userScores.length === 0 ? (
                                                        <span className="text-gray-500 text-sm">Brak rozegranych gier.</span>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            {userScores.map((score: any) => (
                                                                <div key={score.id} className="flex items-center justify-between bg-green-900/20 border border-green-800/50 p-2 rounded w-full max-w-sm">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-white font-bold">{score.game_type}</span>
                                                                        <span className="text-gray-400 text-xs text-left">Wynik: {score.score} | Czas: {score.duration_ms ? (score.duration_ms / 1000).toFixed(2) + "s" : "-"}</span>
                                                                    </div>
                                                                    <button
                                                                        onClick={async () => {
                                                                            if (confirm(`Zresetować wynik z gry ${score.game_type} dla gracza ${u.nick}? Gracz będzie mógł zagrać ponownie.`)) {
                                                                                try {
                                                                                    await deleteUserScore(u.id, score.game_type)
                                                                                    refetchUserScores()
                                                                                } catch (e) {
                                                                                    alert("Błąd podczas usuwania wyniku")
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="ml-4 bg-orange-900/40 hover:bg-orange-700 text-orange-200 hover:text-white px-2 py-1 rounded border border-orange-800 text-xs transition-colors shrink-0"
                                                                    >
                                                                        ZRESETUJ WYNIK
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'scores' && (
                <div className="overflow-x-auto border border-green-800">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-green-900/20 text-green-400">
                            <tr>
                                <th className="p-3">ID</th>
                                <th className="p-3">GRACZ</th>
                                <th className="p-3">GRA</th>
                                <th className="p-3">WYNIK</th>
                                <th className="p-3">CZAS</th>
                                <th className="p-3">DATA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scores?.map((s: any) => (
                                <tr key={s.score.id} className="border-b border-green-900 hover:bg-green-900/10">
                                    <td className="p-3">{s.score.id}</td>
                                    <td className="p-3 font-bold text-white">{s.nick}</td>
                                    <td className="p-3 text-accent">{s.score.game_type}</td>
                                    <td className="p-3 font-bold">{s.score.score}</td>
                                    <td className="p-3 text-gray-400">{s.score.duration_ms ? (s.score.duration_ms / 1000).toFixed(2) + " s" : "-"}</td>
                                    <td className="p-3">{new Date(s.score.played_at).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="overflow-x-auto border border-green-800 font-mono text-xs">
                    <div className="flex justify-between items-center bg-green-900/20 p-2 border-b border-green-800">
                        <span className="text-green-400 font-bold">OSTATNIE ZDARZENIA (MAX 50)</span>
                        <button onClick={() => { if (confirm("Wyczyścić logi?")) clearLogsMutation.mutate() }} className="text-xs border border-green-600 px-2 py-1 text-green-400 hover:bg-green-900">WYCZYŚĆ</button>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-green-900/20 text-green-400 hidden md:table-header-group">
                            <tr>
                                <th className="p-2">ID</th>
                                <th className="p-2">CZAS</th>
                                <th className="p-2">TYP</th>
                                <th className="p-2">SZCZEGÓŁY</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs?.map((l: any) => (
                                <tr key={l.id} className="border-b border-green-900 hover:bg-green-900/10">
                                    <td className="p-2 text-gray-500">{l.id}</td>
                                    <td className="p-2 text-gray-400">{new Date(l.timestamp).toLocaleTimeString()}</td>
                                    <td className={`p-2 font-bold ${l.event_type === 'SOLENOID' ? 'text-red-400' : 'text-green-400'}`}>{l.event_type}</td>
                                    <td className="p-2 text-white">{l.details}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="border border-green-800 p-6 bg-green-900/10">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Settings /> KONFIGURACJA SYSTEMU</h2>

                    <div className="flex items-center justify-between p-4 border border-green-800 bg-black mb-4 flex-col md:flex-row gap-4">
                        <div>
                            <div className="text-white font-bold">ZAWODY AKTYWNE</div>
                            <div className="text-xs text-gray-400">Gdy wyłączone, gry są zablokowane dla uczestników.</div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto flex-wrap justify-end bg-gray-900 p-1 rounded-lg border border-gray-700">
                            <button
                                onClick={() => config?.competition_active !== 'true' && configMutation.mutate({ key: 'competition_active', value: 'true' })}
                                className={`px-6 py-2 rounded font-bold flex-1 md:flex-none transition-all ${config?.competition_active === 'true' ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(0,255,100,0.4)]' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}
                            >
                                TRWA
                            </button>
                            <button
                                onClick={() => config?.competition_active !== 'technical_break' && configMutation.mutate({ key: 'competition_active', value: 'technical_break' })}
                                className={`px-6 py-2 rounded font-bold flex-1 md:flex-none transition-all ${config?.competition_active === 'technical_break' ? 'bg-yellow-600 text-white shadow-[0_0_15px_rgba(255,200,0,0.4)]' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}
                            >
                                PRZERWA
                            </button>
                            <button
                                onClick={() => config?.competition_active !== 'false' && configMutation.mutate({ key: 'competition_active', value: 'false' })}
                                className={`px-6 py-2 rounded font-bold flex-1 md:flex-none transition-all ${config?.competition_active === 'false' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(255,0,0,0.4)]' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}
                            >
                                BLOKADA
                            </button>
                        </div>
                    </div>

                    <div className="mb-4 p-4 border border-green-800 bg-black">
                        <label className="block text-white font-bold mb-4 border-b border-gray-800 pb-2">WIADOMOŚĆ NA TABLICY WYNIKÓW</label>
                        <div className="text-xs text-gray-400 mb-2">Wpisz tekst (np. "Koniec o 14:00"), który pojawi się w prawym górnym rogu ekranów rankingu. Zostaw puste, aby ukryć.</div>
                        <input
                            type="text"
                            placeholder="np. Zakończenie o 14:00"
                            defaultValue={config?.leaderboard_message || ""}
                            onBlur={(e) => configMutation.mutate({ key: 'leaderboard_message', value: e.target.value })}
                            className="bg-gray-900 border border-green-800 p-2 text-white w-full font-mono"
                        />
                    </div>

                    <div className="mb-4 p-4 border border-green-800 bg-black">
                        <label className="block text-white font-bold mb-4 border-b border-gray-800 pb-2">CZAS GRY PATCH MASTER (SEKUNDY)</label>
                        <div className="text-xs text-gray-400 mb-2">Czas w sekundach, przez jaki gracze mogą grać, zanim zdobędą 0 punktów (domyślnie 200).</div>
                        <input
                            type="number"
                            min="10"
                            placeholder="np. 200"
                            defaultValue={config?.pm_total_time || "200"}
                            onBlur={(e) => configMutation.mutate({ key: 'pm_total_time', value: e.target.value })}
                            className="bg-gray-900 border border-green-800 p-2 text-white w-full max-w-xs font-mono"
                        />
                    </div>

                    <div className="mb-4 p-4 border border-green-800 bg-black">
                        <label className="block text-white font-bold mb-4 border-b border-gray-800 pb-2">KONFIGURACJA EMAIL (SMTP)</label>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">NADAWCA (FROM)</label>
                                <input
                                    type="email"
                                    placeholder="noreply@checkit.com"
                                    defaultValue={config?.email_sender || ""}
                                    onBlur={(e) => configMutation.mutate({ key: 'email_sender', value: e.target.value })}
                                    className="bg-gray-900 border border-green-800 p-2 text-white w-full"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">SMTP HOST</label>
                                <input
                                    placeholder="smtp.gmail.com"
                                    defaultValue={config?.smtp_host || ""}
                                    onBlur={(e) => configMutation.mutate({ key: 'smtp_host', value: e.target.value })}
                                    className="bg-gray-900 border border-green-800 p-2 text-white w-full"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">SMTP PORT</label>
                                <input
                                    placeholder="587"
                                    defaultValue={config?.smtp_port || "587"}
                                    onBlur={(e) => configMutation.mutate({ key: 'smtp_port', value: e.target.value })}
                                    className="bg-gray-900 border border-green-800 p-2 text-white w-full"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">SMTP USER</label>
                                <input
                                    placeholder="user@example.com"
                                    defaultValue={config?.smtp_user || ""}
                                    onBlur={(e) => configMutation.mutate({ key: 'smtp_user', value: e.target.value })}
                                    className="bg-gray-900 border border-green-800 p-2 text-white w-full"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">SMTP PASSWORD</label>
                                <input
                                    type="password"
                                    placeholder="******"
                                    defaultValue={config?.smtp_password || ""}
                                    onBlur={(e) => configMutation.mutate({ key: 'smtp_password', value: e.target.value })}
                                    className="bg-gray-900 border border-green-800 p-2 text-white w-full"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 p-4 border border-red-800/50 bg-red-900/5">
                        <div className="text-red-400 font-bold mb-2">STREFA NIEBEZPIECZNA</div>
                        <button
                            onClick={() => { if (confirm("POWAŻNIE: TO USUNIE WSZYSTKICH UŻYTKOWNIKÓW, WYNIKI I LOGI. CZY NA PEWNO?")) resetDbMutation.mutate() }}
                            className="text-red-500 hover:text-white border border-red-500 px-4 py-2 text-xs w-full md:w-auto"
                        >
                            RESET DATABASE (WIPE ALL)
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'email' && (
                <div className="border border-green-800 p-6 bg-green-900/10">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Mail /> POWIADOMIENIA EMAIL</h2>

                    {emailSuccess && <div className="mb-4 p-4 bg-green-500/20 text-white border border-green-500">{emailSuccess}</div>}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-green-400 font-bold mb-4">SZABLONY WIADOMOŚCI</h3>
                            <div className="space-y-4">
                                {templates?.map((t: any) => (
                                    <div key={t.slug} className="p-4 border border-green-800 bg-black hover:bg-green-900/10 cursor-pointer" onClick={() => setEditingTemplate(t)}>
                                        <div className="text-xs text-gray-500 uppercase">{t.slug}</div>
                                        <div className="font-bold text-white">{t.subject}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            {editingTemplate ? (
                                <div className="border border-green-500 p-4 bg-black h-full">
                                    <h3 className="text-white font-bold mb-4">EDYCJA: {editingTemplate.slug}</h3>
                                    <div className="mb-4">
                                        <label className="block text-xs text-gray-500 mb-1">TEMAT</label>
                                        <input
                                            value={editingTemplate.subject}
                                            onChange={e => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                                            className="w-full bg-gray-900 border border-green-800 p-2 text-white"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-xs text-gray-500 mb-1">TREŚĆ (Obsługuje: {'{nick}'}, {'{score}'}, {'{game}'})</label>
                                        <textarea
                                            value={editingTemplate.body}
                                            onChange={e => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                                            className="w-full h-40 bg-gray-900 border border-green-800 p-2 text-white font-mono text-sm"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setEditingTemplate(null)} className="px-4 py-2 text-gray-400 hover:text-white">ANULUJ</button>
                                        <button onClick={() => updateTemplateMutation.mutate()} className="px-4 py-2 bg-green-600 text-white hover:bg-green-500">ZAPISZ</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="border border-green-800 p-4 bg-black h-full flex flex-col justify-center items-center text-center">
                                    <div className="mb-6">
                                        <h3 className="text-xl font-bold text-white mb-2">MASOWA WYSYŁKA</h3>
                                        <p className="text-gray-400 text-sm">
                                            System automatycznie wyłoni zwycięzców (Top 3 Grandmaster + Kategorie) i wyśle im odpowiednie wiadomości.
                                            Pozostali otrzymają podziękowanie.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { if (confirm("Czy na pewno wysłać e-maile do WSZYSTKICH?")) sendEmailsMutation.mutate() }}
                                        className="bg-white text-black font-bold px-8 py-4 rounded hover:bg-gray-200 transition"
                                    >
                                        WYŚLIJ NAGRODY I PODZIĘKOWANIA
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div >
    )
}
