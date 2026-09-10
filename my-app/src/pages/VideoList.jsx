import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_URL } from '../api.js'

function VideoList() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API_URL}/video`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => setVideos(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p style={{ padding: 24 }}>Загрузка...</p>
  if (error) return <p style={{ padding: 24 }}>Ошибка: {error}</p>

  return (
    <div style={{ padding: 24 }}>
      <h1>Все видео</h1>
      <ul>
        {videos.map((video) => (
          <li key={video.id}>
            <Link to={`/video/${video.id}`}>{video.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default VideoList
