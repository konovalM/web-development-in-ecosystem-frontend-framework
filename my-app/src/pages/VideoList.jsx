import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  addFavorite,
  createVideo,
  getFavorites,
  getVideos,
  removeFavorite,
} from '../api.js'

const EMPTY_FORM = {
  title: '',
  description: '',
  url: '',
  duration: '',
  theme: '',
  author: '',
}

function AddVideoModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        url: form.url,
        duration: Number(form.duration),
      }
      if (form.description) payload.description = form.description
      if (form.theme) payload.theme = form.theme
      if (form.author) payload.author = form.author

      const created = await createVideo(payload)
      onCreated(created)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Новое видео</h2>
        <p className="hint">
          Добавляем ссылкой — сам файл не грузим, только метаданные.
        </p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label>Название *</label>
            <input
              value={form.title}
              onChange={set('title')}
              placeholder="Обзор NestJS"
            />
          </div>
          <div className="field">
            <label>Ссылка на видео (mp4, mov, webm, mkv) *</label>
            <input
              value={form.url}
              onChange={set('url')}
              placeholder="https://samplelib.com/mp4/sample-10s.mp4"
            />
          </div>
          <div className="field">
            <label>Длительность, секунд *</label>
            <input
              type="number"
              value={form.duration}
              onChange={set('duration')}
              placeholder="120"
            />
          </div>
          <div className="field">
            <label>Тема</label>
            <input
              value={form.theme}
              onChange={set('theme')}
              placeholder="backend"
            />
          </div>
          <div className="field">
            <label>Автор</label>
            <input
              value={form.author}
              onChange={set('author')}
              placeholder="ii4elka"
            />
          </div>
          <div className="field">
            <label>Описание</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={set('description')}
              placeholder="Коротко о чём видео"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Сохраняю…' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function VideoCard({ video, isFav, onToggleFav }) {
  return (
    <div className="card">
      <Link
        to={`/video/${video.id}`}
        className="thumb"
        aria-label={video.title}
      />
      <div className="card-body">
        <span className="badge">{video.theme}</span>
        <Link
          to={`/video/${video.id}`}
          className="card-title"
          style={{ color: 'inherit' }}
        >
          {video.title}
        </Link>
        <div className="card-meta">
          {video.author} · {video.duration} сек · {video.status}
        </div>
        <div className="card-actions">
          <button
            className={`fav ${isFav ? 'on' : ''}`}
            onClick={() => onToggleFav(video)}
          >
            {isFav ? '★ В избранном' : '☆ В избранное'}
          </button>
        </div>
      </div>
    </div>
  )
}

function VideoList() {
  const [videos, setVideos] = useState([])
  const [favorites, setFavorites] = useState([])
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('all') // 'all' | 'fav'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  const favIds = useMemo(() => new Set(favorites.map((v) => v.id)), [favorites])

  // Поиск с debounce — фильтр по title уходит на бэкенд (GET /video?title=).
  useEffect(() => {
    if (tab !== 'all') return
    setLoading(true)
    const timer = setTimeout(() => {
      getVideos(query)
        .then(setVideos)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [query, tab])

  // Избранное грузим с бэкенда (эндпоинт /favorites).
  function refreshFavorites() {
    return getFavorites()
      .then(setFavorites)
      .catch(() => {})
  }
  useEffect(() => {
    refreshFavorites()
  }, [])

  async function toggleFav(video) {
    try {
      if (favIds.has(video.id)) {
        await removeFavorite(video.id)
      } else {
        await addFavorite(video.id)
      }
      await refreshFavorites()
    } catch (err) {
      setError(err.message)
    }
  }

  function handleCreated() {
    setModalOpen(false)
    setTab('all')
    setQuery('')
    getVideos('')
      .then(setVideos)
      .catch(() => {})
  }

  const list = tab === 'all' ? videos : favorites

  return (
    <div className="app">
      <div className="topbar">
        <div>
          <div className="logo">
            Vid<span className="dot">Nest</span>
          </div>
          <div className="subtitle">видеохостинг · NestJS + React</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          + Добавить видео
        </button>
      </div>

      <div className="toolbar">
        <input
          className="search"
          placeholder="Поиск по названию, автору или теме…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={tab === 'fav'}
        />
        <div className="tabs">
          <button
            className={tab === 'all' ? 'active' : ''}
            onClick={() => setTab('all')}
          >
            Все видео
          </button>
          <button
            className={tab === 'fav' ? 'active' : ''}
            onClick={() => setTab('fav')}
          >
            ★ Избранное ({favorites.length})
          </button>
        </div>
      </div>

      {error && <p className="state">Ошибка: {error}</p>}

      {tab === 'all' && loading ? (
        <p className="state">Загрузка…</p>
      ) : list.length === 0 ? (
        <p className="state">
          {tab === 'fav' ? 'В избранном пока пусто' : 'Ничего не найдено'}
        </p>
      ) : (
        <div className="grid">
          {list.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              isFav={favIds.has(video.id)}
              onToggleFav={toggleFav}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <AddVideoModal
          onClose={() => setModalOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}

export default VideoList
