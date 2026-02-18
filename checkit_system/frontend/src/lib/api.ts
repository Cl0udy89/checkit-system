import axios from 'axios'

export const api = axios.create({
    baseURL: `http://${window.location.hostname}:8000/api/v1`
})

// Auth Interceptor
api.interceptors.request.use(config => {
    const token = localStorage.getItem('admin_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

export const loginAdmin = async (formData: FormData) => {
    const res = await api.post('/auth/token', formData)
    return res.data
}

export const deleteUser = async (userId: number) => {
    const res = await api.delete(`/admin/users/${userId}`)
    return res.data
}

export const fetchAdminUsers = async () => (await api.get('/admin/users')).data
export const fetchAdminScores = async () => (await api.get('/admin/scores')).data

export const fetchITMatchQuestions = async () => (await api.get('/game/it-match/questions')).data

export const fetchLeaderboard = async () => {
    const { data } = await api.get('/leaderboard')
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
