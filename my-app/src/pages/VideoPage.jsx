import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getVideo } from '../api.js'

function VideoPage() {
  const { id } = useParams()
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getVideo(id)
      .then(setVideo)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="state">Загрузка…</p>
  if (error)
    return (
      <div className="app">
        <Link to="/">← Назад к списку</Link>
        <p className="state">Ошибка: {error}</p>
      </div>
    )
  if (!video) return null

  return (
    <div className="app">
      <Link to="/">← Назад к списку</Link>
      <h1 style={{ fontSize: 32, margin: '18px 0 6px' }}>{video.title}</h1>
      <div className="card-meta" style={{ marginBottom: 16 }}>
        {video.author} · тема: {video.theme} · {video.duration} сек ·{' '}
        {video.status}
      </div>
      <video
        src={video.url}
        controls
        style={{
          width: '100%',
          maxWidth: 720,
          borderRadius: 14,
          background: '#000',
        }}
      />
      {video.description && (
        <p style={{ marginTop: 16, color: 'var(--muted)', maxWidth: 720 }}>
          {video.description}
        </p>
      )}
    </div>
  )
}

export default VideoPage
