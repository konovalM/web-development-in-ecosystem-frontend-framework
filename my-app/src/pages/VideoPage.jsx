import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { bytes, request, statusLabel } from '../api.js'
import { useSession } from '../session.js'
function VideoPage() {
  const { id } = useParams(),
    { user } = useSession()
  const [result, setResult] = useState(null)
  useEffect(() => {
    const controller = new AbortController()
    request(`/videos/${id}`, { user, signal: controller.signal })
      .then((video) => setResult({ id, video }))
      .catch((e) => {
        if (e.name !== 'AbortError') setResult({ id, error: e.message })
      })
    return () => controller.abort()
  }, [id, user])
  if (result?.id !== id) return <p className="empty-state">Загрузка видео…</p>
  if (result.error)
    return (
      <div className="workspace">
        <Link to="/">← В каталог</Link>
        <p role="alert" className="form-error">
          {result.error}
        </p>
      </div>
    )
  const video = result.video
  return (
    <article className="workspace video-page">
      <Link to="/">← В каталог</Link>
      <header className="page-heading">
        <div>
          <span className="eyebrow">
            {video.channelTitle} / {video.author}
          </span>
          <h1>{video.title}</h1>
          <p>
            {statusLabel[video.status]} · {bytes(video.sizeBytes)}
          </p>
        </div>
        <Link className="btn" to="/mine">
          Управление своими видео
        </Link>
      </header>
      {video.playbackUrl ? (
        <video key={id} src={video.playbackUrl} controls preload="metadata" />
      ) : (
        <div className="media-placeholder">
          <h2>Карточка метаданных</h2>
          <p>Автор пока не добавил ссылку для воспроизведения.</p>
        </div>
      )}
      <div className="video-details">
        <p>{video.description || 'Описание не добавлено.'}</p>
        <div className="tag-chips">
          {video.tags.map((tag) => (
            <span key={tag.id}>{tag.name}</span>
          ))}
        </div>
        <dl>
          <div>
            <dt>Создано</dt>
            <dd>{new Date(video.createdAt).toLocaleString('ru-RU')}</dd>
          </div>
          <div>
            <dt>Первая публикация</dt>
            <dd>
              {video.publishedAt
                ? new Date(video.publishedAt).toLocaleString('ru-RU')
                : 'Ещё не опубликовано'}
            </dd>
          </div>
          <div>
            <dt>Комментарии</dt>
            <dd>
              {video.commentsEnabled ? 'Разрешены' : 'Выключены'}{' '}
              <small>(настройка; сами комментарии пока не реализованы)</small>
            </dd>
          </div>
        </dl>
      </div>
    </article>
  )
}
export default VideoPage
