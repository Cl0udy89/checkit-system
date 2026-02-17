import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
    id: number
    nick: string
    email: string
}

interface GameState {
    user: User | null
    setUser: (user: User) => void
    resetGame: () => void
    login: (user: User) => void
    logout: () => void
}

export const useGameStore = create<GameState>()(
    persist(
        (set) => ({
            user: null,
            score: 0,
            login: (user) => set({ user }),
            logout: () => set({ user: null, score: 0 }),
            setScore: (score) => set({ score }),
            resetGame: () => set({ score: 0 }),
        }),
        {
            name: 'checkit-storage',
        }
    )
)
