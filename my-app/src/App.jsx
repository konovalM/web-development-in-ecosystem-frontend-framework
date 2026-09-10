import { Routes, Route } from 'react-router-dom'
import VideoList from './pages/VideoList.jsx'
import VideoPage from './pages/VideoPage.jsx'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<VideoList />} />
      <Route path="/video/:id" element={<VideoPage />} />
    </Routes>
  )
}

export default App
