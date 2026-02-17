import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Welcome from './pages/Welcome'
// Placeholder imports for now
const Dashboard = () => <div className="p-10 text-primary">Dashboard (TODO)</div>
import BinaryBrain from './pages/BinaryBrain'
import PatchMaster from './pages/PatchMaster'
import ITMatch from './pages/ITMatch'
import Leaderboard from './pages/Leaderboard'
import Admin from './pages/Admin'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-white selection:bg-primary selection:text-black">
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/game/binary-brain" element={<BinaryBrain />} />
          <Route path="/game/patch-master" element={<PatchMaster />} />
          <Route path="/game/it-match" element={<ITMatch />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
