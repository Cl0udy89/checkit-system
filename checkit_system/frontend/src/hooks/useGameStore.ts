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
    logout: () => void
}

export const useGameStore = create<GameState>()(
    persist(
        (set) => ({
            user: null,
            setUser: (user) => set({ user }),
            logout: () => set({ user: null }),
        }),
        {
            name: 'checkit-storage',
        }
    )
)
