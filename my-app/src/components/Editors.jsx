import { useEffect, useRef, useState } from 'react'
import { request, videoPage, statusLabel } from '../api.js'

export function Modal({ title, onClose, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const node = ref.current
    node.showModal()
    return () => node.close()
  }, [])
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return
        const r = e.currentTarget.getBoundingClientRect()
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          onClose()
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-btn" aria-label="Закрыть" onClick={onClose}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  )
}
export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function Editor({ kind, item, refs, user, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    title: item?.title || '',
    description: item?.description || '',
    name: item?.name || '',
    displayName: item?.displayName || '',
    email: item?.email || '',
    channelId: String(
      item?.channelId ||
        refs.channels.find((c) => c.ownerId === Number(user))?.id ||
        ''
    ),
    sizeBytes: item?.sizeBytes || '',
    quotaBytes: '1073741824',
    playbackUrl: item?.playbackUrl || '',
    commentsEnabled: item?.commentsEnabled ?? true,
    tagIds: item?.tags?.map((t) => t.id) || []
  }))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (key) => (e) =>
    setForm((old) => ({
      ...old,
      [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value
    }))
  const names = {
    video: 'видео',
    channel: 'канал',
    tag: 'тег',
    playlist: 'плейлист',
    user: 'пользователя'
  }
  async function submit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      let path, body
      if (kind === 'video') {
        body = {
          title: form.title,
          description: form.description,
          tagIds: form.tagIds,
          commentsEnabled: form.commentsEnabled,
          playbackUrl: form.playbackUrl || null
        }
        if (!item)
          Object.assign(body, {
            channelId: Number(form.channelId),
            sizeBytes: form.sizeBytes
          })
        path = '/videos'
      } else if (kind === 'user') {
        path = item ? '/me' : '/users'
        body = { displayName: form.displayName, email: form.email }
      } else if (kind === 'tag') {
        path = '/tags'
        body = { name: form.name }
      } else if (kind === 'channel') {
        path = '/channels'
        body = {
          title: form.title,
          ...(!item ? { quotaBytes: form.quotaBytes } : {})
        }
      } else {
        path = '/me/playlists'
        body = { title: form.title }
      }
      if (item && kind !== 'user') path += `/${item.id}`
      const result = await request(path, {
        user,
        method: item ? 'PATCH' : 'POST',
        body
      })
      onSaved(result)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }
  return (
    <Modal
      title={`${item ? 'Редактировать' : 'Создать'} ${names[kind]}`}
      onClose={() => !saving && onClose()}
    >
      <form onSubmit={submit}>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {kind === 'user' ? (
          <>
            <Field label="Имя">
              <input
                autoFocus
                required
                maxLength={100}
                value={form.displayName}
                onChange={set('displayName')}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                required
                maxLength={254}
                value={form.email}
                onChange={set('email')}
              />
            </Field>
          </>
        ) : kind === 'tag' ? (
          <Field label="Название тега">
            <input
              autoFocus
              required
              maxLength={60}
              value={form.name}
              onChange={set('name')}
              placeholder="программирование"
            />
          </Field>
        ) : (
          <Field label="Название">
            <input
              autoFocus
              required
              minLength={kind === 'video' ? 3 : 1}
              maxLength={100}
              value={form.title}
              onChange={set('title')}
            />
          </Field>
        )}
        {kind === 'channel' && !item && (
          <Field label="Лимит канала, байт">
            <input
              required
              inputMode="numeric"
              pattern="0|[1-9][0-9]{0,18}"
              value={form.quotaBytes}
              onChange={set('quotaBytes')}
            />
            <small>
              Устанавливается при создании. Позже квота не меняется.
            </small>
          </Field>
        )}
        {kind === 'video' && (
          <>
            <div className="form-columns">
              <Field label="Канал">
                <select
                  required
                  disabled={!!item}
                  value={form.channelId}
                  onChange={set('channelId')}
                >
                  <option value="">Выберите канал</option>
                  {refs.channels
                    .filter((c) => c.ownerId === Number(user))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Размер, байт">
                <input
                  required
                  disabled={!!item}
                  inputMode="numeric"
                  pattern="[1-9][0-9]{0,18}"
                  value={form.sizeBytes}
                  onChange={set('sizeBytes')}
                />
              </Field>
            </div>
            {!refs.channels.some((c) => c.ownerId === Number(user)) && (
              <p className="hint">
                Сначала создайте свой канал в разделе «Каналы».
              </p>
            )}
            <Field label="Описание">
              <textarea
                rows={3}
                maxLength={1000}
                value={form.description}
                onChange={set('description')}
              />
            </Field>
            <Field label="Ссылка на видео (необязательно)">
              <input
                type="url"
                maxLength={2048}
                value={form.playbackUrl}
                onChange={set('playbackUrl')}
                placeholder="https://…/video.mp4"
              />
              <small>
                Воспроизведение по внешней ссылке, без загрузки файла.
              </small>
            </Field>
            <label className="check-line">
              <input
                type="checkbox"
                checked={form.commentsEnabled}
                onChange={set('commentsEnabled')}
              />
              Комментарии разрешены
            </label>
            <fieldset className="tag-options">
              <legend>Теги</legend>
              {refs.tags.length ? (
                refs.tags.map((tag) => (
                  <label key={tag.id} className="tag-option">
                    <input
                      type="checkbox"
                      checked={form.tagIds.includes(tag.id)}
                      onChange={(e) =>
                        setForm((old) => ({
                          ...old,
                          tagIds: e.target.checked
                            ? [...old.tagIds, tag.id]
                            : old.tagIds.filter((id) => id !== tag.id)
                        }))
                      }
                    />
                    {tag.name}
                  </label>
                ))
              ) : (
                <p className="hint">Создайте теги в разделе «Теги».</p>
              )}
            </fieldset>
            {!item && (
              <p className="hint">
                Видео будет сохранено как черновик. Опубликовать его можно в
                разделе «Мои видео».
              </p>
            )}
          </>
        )}
        <div className="modal-actions">
          <button
            type="button"
            className="btn"
            disabled={saving}
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            className="btn btn-primary"
            disabled={saving || (kind === 'video' && !form.channelId)}
          >
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function VideoPicker({ user, playlist, onClose, onSaved }) {
  const [scope, setScope] = useState('catalog'),
    [query, setQuery] = useState(''),
    [page, setPage] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setPage(null)
      setError('')
      videoPage(
        scope === 'catalog' ? '/videos' : '/me/videos',
        { q: query },
        { user, signal: controller.signal }
      )
        .then(setPage)
        .catch((e) => {
          if (e.name !== 'AbortError') setError(e.message)
        })
    }, 200)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [user, scope, query])
  async function more() {
    setBusy(true)
    try {
      const next = await videoPage(
        scope === 'catalog' ? '/videos' : '/me/videos',
        { q: query, cursor: page.nextCursor },
        { user }
      )
      setPage((old) => ({ ...next, items: [...old.items, ...next.items] }))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  async function add(id) {
    setBusy(true)
    try {
      await request(`/me/playlists/${playlist.id}/items`, {
        user,
        method: 'POST',
        body: { videoId: id }
      })
      onSaved()
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }
  return (
    <Modal
      title={`Добавить в «${playlist.title}»`}
      onClose={() => !busy && onClose()}
    >
      <div className="toolbar">
        <input
          aria-label="Найти видео для плейлиста"
          className="search"
          placeholder="Название видео"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Источник видео"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        >
          <option value="catalog">Публичный каталог</option>
          <option value="mine">Мои видео</option>
        </select>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {!page ? (
        <p className="hint">Загрузка…</p>
      ) : (
        <>
          <div className="pick-list">
            {page.items.map((v) => (
              <div className="pick-row" key={v.id}>
                <div>
                  <strong>{v.title}</strong>
                  <small>
                    {v.channelTitle} · {statusLabel[v.status]}
                  </small>
                </div>
                <button
                  className="btn"
                  disabled={busy}
                  onClick={() => add(v.id)}
                >
                  Добавить
                </button>
              </div>
            ))}
          </div>
          {!page.items.length && <p className="hint">Видео не найдены.</p>}
          {page.nextCursor && (
            <button className="btn" disabled={busy} onClick={more}>
              Показать ещё
            </button>
          )}
        </>
      )}
    </Modal>
  )
}
