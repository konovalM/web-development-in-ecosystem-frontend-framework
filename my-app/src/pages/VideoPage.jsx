import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { API_URL } from '../api.js'

function VideoPage() {
  const { id } = useParams()
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`${API_URL}/video/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => setVideo(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p style={{ padding: 24 }}>Загрузка...</p>
  if (error) return <p style={{ padding: 24 }}>Ошибка: {error}</p>
  if (!video) return null

  return (
    <div style={{ padding: 24 }}>
      <Link to="/">← Назад к списку</Link>
      <h1>{video.title}</h1>
      <p>{video.description}</p>
      <video src={video.url} controls width="640" />
      <p>Длительность: {video.duration} сек</p>
    </div>
  )
}

export default VideoPage
