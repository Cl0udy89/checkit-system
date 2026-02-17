import axios from 'axios'

export const api = axios.create({
    baseURL: 'http://localhost:8000/api/v1', // TODO: Make configurable via env
    headers: {
        'Content-Type': 'application/json',
    },
})

export const fetchLeaderboard = async () => {
    const { data } = await api.get('/leaderboard/')
    return data
}

export const fetchGameContent = async (gameType: string) => {
    const { data } = await api.get(`/games/content/${gameType}`)
    return data
}

export const submitGameScore = async (payload: { user_id: number, game_type: string, answers: any, duration_ms: number }) => {
    const { data } = await api.post('/games/submit', payload)
    return data
}

export const fetchPatchPanelState = async () => {
    const { data } = await api.get('/games/patch_panel/state')
    return data
}
