import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Welcome from './pages/Welcome'
import Dashboard from './pages/Dashboard'
import BinaryBrain from './pages/BinaryBrain'
import PatchMaster from './pages/PatchMaster'
import ITMatch from './pages/ITMatch'
import TextMatch from './pages/TextMatch'
import Leaderboard from './pages/Leaderboard'
import ScreenLeaderboard from './pages/ScreenLeaderboard'
import Admin from './pages/Admin'

import InteractiveBackground from './components/InteractiveBackground'

function GameRoutes() {
  const location = useLocation()
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/game/binary-brain" element={<BinaryBrain key={location.key} />} />
      <Route path="/game/patch-master" element={<PatchMaster key={location.key} />} />
      <Route path="/game/it-match" element={<ITMatch key={location.key} />} />
      <Route path="/game/text-match" element={<TextMatch key={location.key} />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/screen" element={<ScreenLeaderboard />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen text-white selection:bg-primary selection:text-black">
        <InteractiveBackground />
        <GameRoutes />
      </div>
    </BrowserRouter>
  )
}

export default App
