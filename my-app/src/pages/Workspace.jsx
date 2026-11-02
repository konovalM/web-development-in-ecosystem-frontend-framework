import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { bytes, request, statusLabel, videoPage } from '../api.js'
import { useSession } from '../session.js'
import { Editor, Field, Modal, VideoPicker } from '../components/Editors.jsx'

const titles = [
  'Каталог',
  'Мои видео',
  'Избранное',
  'Плейлисты',
  'Каналы',
  'Теги',
  'Пользователи'
]
const captions = [
  'Открывайте опубликованные видео и собирайте свои подборки.',
  'Черновики, публикации и настройки ваших видео.',
  'Видео, к которым хочется вернуться.',
  'Собирайте видео в подборки и задавайте порядок просмотра.',
  'Ваши каналы, их видео и доступное место.',
  'Общие метки для организации видеотеки.',
  'Выбирайте участника и управляйте своим профилем.'
]
const createKinds = [
  'video',
  'video',
  null,
  'playlist',
  'channel',
  'tag',
  'user'
]
const createLabels = [
  'Добавить видео',
  'Добавить видео',
  '',
  'Создать плейлист',
  'Создать канал',
  'Создать тег',
  'Добавить пользователя'
]

function PlaylistDetail({
  playlistId,
  user,
  revision,
  onChange,
  onPick,
  onEdit,
  onDelete
}) {
  const [detail, setDetail] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!playlistId) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setDetail(null)
      setError('')
      request(`/me/playlists/${playlistId}`, {
        user,
        signal: controller.signal
      })
        .then(setDetail)
        .catch((e) => {
          if (e.name !== 'AbortError') setError(e.message)
        })
    }, 0)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [playlistId, user, revision])
  async function change(path, method, body) {
    setBusy(true)
    setError('')
    try {
      const next = await request(path, { user, method, body })
      setDetail(next)
      onChange()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  function move(index, offset) {
    const ids = detail.items.map((v) => v.id)
    ;[ids[index], ids[index + offset]] = [ids[index + offset], ids[index]]
    return change(`/me/playlists/${playlistId}/order`, 'PUT', { videoIds: ids })
  }
  if (!playlistId)
    return (
      <div className="empty-state">
        <h2>Ваша первая подборка</h2>
        <p>Создайте плейлист, затем добавьте в него видео.</p>
      </div>
    )
  if (!detail)
    return (
      <div className="panel">
        {error ? (
          <p role="alert" className="form-error">
            {error}
          </p>
        ) : (
          <p className="hint">Загрузка плейлиста…</p>
        )}
      </div>
    )
  return (
    <section className="panel playlist-detail">
      <div className="section-top">
        <div>
          <span className="eyebrow">Плейлист</span>
          <h2>{detail.title}</h2>
        </div>
        <div className="row-actions">
          <button className="btn" onClick={() => onEdit(detail)}>
            Переименовать
          </button>
          <button className="btn danger" onClick={() => onDelete(detail)}>
            Удалить
          </button>
        </div>
      </div>
      <button className="btn btn-primary" onClick={() => onPick(detail)}>
        Добавить видео
      </button>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <ol className="playlist-items">
        {detail.items.map((v, index) => (
          <li key={v.id}>
            <span className="position">
              {v.position.toString().padStart(2, '0')}
            </span>
            <div className="item-title">
              {v.available ? (
                <Link to={`/video/${v.id}`}>{v.title}</Link>
              ) : (
                <strong>Недоступное видео</strong>
              )}
              <small>
                {v.available ? statusLabel[v.status] : 'Автор ограничил доступ'}
              </small>
            </div>
            <div className="row-actions">
              <button
                aria-label={`Поднять ${v.title}`}
                className="icon-btn"
                disabled={busy || index === 0}
                onClick={() => move(index, -1)}
              >
                ↑
              </button>
              <button
                aria-label={`Опустить ${v.title}`}
                className="icon-btn"
                disabled={busy || index === detail.items.length - 1}
                onClick={() => move(index, 1)}
              >
                ↓
              </button>
              <button
                className="btn"
                disabled={busy}
                onClick={() =>
                  change(`/me/playlists/${playlistId}/items/${v.id}`, 'DELETE')
                }
              >
                Убрать
              </button>
            </div>
          </li>
        ))}
      </ol>
      {!detail.items.length && (
        <p className="empty-note">
          Плейлист пока пуст. Добавьте видео из каталога или своих черновиков.
        </p>
      )}
    </section>
  )
}

export default function Workspace({ section }) {
  const { user, users, setUser, refreshUsers } = useSession()
  const navigate = useNavigate()
  const [data, setData] = useState(null),
    [query, setQuery] = useState(''),
    [channelId, setChannelId] = useState(''),
    [revision, setRevision] = useState(0)
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [modal, setModal] = useState(null),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState(null)
  const [chosenPlaylist, setChosenPlaylist] = useState('')
  const refresh = () => {
    setRevision((v) => v + 1)
    refreshUsers()
  }
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(
      async () => {
        try {
          setError('')
          const options = { user, signal: controller.signal }
          const [channels, tags, playlists, favorites, page] =
            await Promise.all([
              request('/channels', options),
              request('/tags', options),
              request('/me/playlists', options),
              request('/me/favorites', options),
              section < 2
                ? videoPage(
                    section === 1 ? '/me/videos' : '/videos',
                    { q: query, channelId },
                    options
                  )
                : Promise.resolve(null)
            ])
          if (!controller.signal.aborted)
            setData({ channels, tags, playlists, favorites, page })
        } catch (e) {
          if (e.name !== 'AbortError') setError(e.message)
        }
      },
      query ? 200 : 0
    )
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [user, section, query, channelId, revision])
  async function action(run, message = 'Изменения сохранены') {
    setBusy(true)
    setError('')
    try {
      await run()
      setNotice(message)
      refresh()
      setModal(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  async function openVideoEditor(id) {
    setError('')
    try {
      const video = await request(`/videos/${id}`, { user })
      setModal({ kind: 'video', item: video })
    } catch (e) {
      setError(e.message)
    }
  }
  async function more() {
    setBusy(true)
    try {
      const page = await videoPage(
        section === 1 ? '/me/videos' : '/videos',
        { q: query, channelId, cursor: data.page.nextCursor },
        { user }
      )
      setData((old) => ({
        ...old,
        page: { ...page, items: [...old.page.items, ...page.items] }
      }))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  function saved(result) {
    const kind = modal.kind,
      existed = !!modal.item
    setModal(null)
    setNotice('Сохранено')
    refresh()
    if (kind === 'video' && !existed) navigate('/mine')
    if (kind === 'playlist' && !existed) setSelected(result.id)
  }
  function confirm(title, run) {
    setModal({ kind: 'confirm', title, run })
  }
  const own = (c) => c.ownerId === Number(user)
  const activePlaylist =
    selected && data?.playlists.some((p) => p.id === selected)
      ? selected
      : data?.playlists[0]?.id
  const currentUser = users.find((u) => u.id === Number(user))
  const videos = section === 2 ? data?.favorites : data?.page?.items
  const favorites = new Set(data?.favorites.map((v) => v.id))
  return (
    <div className="workspace">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Библиотека / {titles[section]}</span>
          <h1>{titles[section]}</h1>
          <p>{captions[section]}</p>
        </div>
        {createKinds[section] && (
          <button
            className="btn btn-primary"
            disabled={!data}
            onClick={() => setModal({ kind: createKinds[section] })}
          >
            + {createLabels[section]}
          </button>
        )}
      </header>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
          <button
            aria-label="Скрыть уведомление"
            className="icon-btn"
            onClick={() => setNotice('')}
          >
            ×
          </button>
        </div>
      )}
      {!data ? (
        <p className="empty-state">
          {error ? 'Не удалось загрузить данные.' : 'Загрузка библиотеки…'}
        </p>
      ) : (
        <>
          {section < 2 && (
            <div className="toolbar">
              <input
                aria-label="Поиск видео"
                className="search"
                placeholder="Поиск по названию"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                aria-label="Фильтр по каналу"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
              >
                <option value="">Все каналы</option>
                {data.channels
                  .filter((c) => section !== 1 || own(c))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
              </select>
              <span className="hint">
                {section === 1 ? 'Все статусы' : 'Опубликованные видео'}
              </span>
            </div>
          )}
          {section <= 2 && (
            <>
              <div className="grid">
                {videos?.map((v) => {
                  const canEdit =
                    section === 1 ||
                    own(data.channels.find((c) => c.id === v.channelId) || {})
                  return (
                    <article className="card" key={v.id}>
                      <Link to={`/video/${v.id}`} className="thumb">
                        <span className="video-type">
                          {v.playbackUrl ? 'Видео' : 'Метаданные'}
                        </span>
                        <span className={`video-status ${v.status}`}>
                          {statusLabel[v.status]}
                        </span>
                      </Link>
                      <div className="card-body">
                        <span className="channel-label">{v.channelTitle}</span>
                        <Link to={`/video/${v.id}`} className="card-title">
                          {v.title}
                        </Link>
                        <p className="card-meta">
                          {v.author} · {bytes(v.sizeBytes)}
                        </p>
                        <div className="tag-chips">
                          {v.tags?.map((t) => (
                            <span key={t.id}>{t.name}</span>
                          ))}
                        </div>
                        <div className="card-actions">
                          {v.status === 'published' && (
                            <button
                              className={`fav ${favorites.has(v.id) ? 'on' : ''}`}
                              disabled={busy}
                              onClick={() =>
                                action(
                                  () =>
                                    request(`/me/favorites/${v.id}`, {
                                      user,
                                      method: favorites.has(v.id)
                                        ? 'DELETE'
                                        : 'PUT'
                                    }),
                                  favorites.has(v.id)
                                    ? 'Убрано из избранного'
                                    : 'Добавлено в избранное'
                                )
                              }
                            >
                              {favorites.has(v.id)
                                ? 'В избранном'
                                : 'В избранное'}
                            </button>
                          )}
                          <button
                            className="fav"
                            onClick={() => {
                              setChosenPlaylist(
                                String(data.playlists[0]?.id || '')
                              )
                              setModal({ kind: 'addToPlaylist', video: v })
                            }}
                          >
                            В плейлист
                          </button>
                        </div>
                        {canEdit && (
                          <div className="card-actions owner-actions">
                            <button
                              className="fav"
                              onClick={() => openVideoEditor(v.id)}
                            >
                              Редактировать
                            </button>
                            <button
                              className="fav"
                              disabled={busy}
                              onClick={() =>
                                action(
                                  () =>
                                    request(`/videos/${v.id}/status`, {
                                      user,
                                      method: 'PATCH',
                                      body: {
                                        status:
                                          v.status === 'published'
                                            ? 'hidden'
                                            : 'published'
                                      }
                                    }),
                                  v.status === 'published'
                                    ? 'Видео скрыто'
                                    : 'Видео опубликовано'
                                )
                              }
                            >
                              {v.status === 'published'
                                ? 'Скрыть'
                                : 'Опубликовать'}
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
              {!videos?.length && (
                <div className="empty-state">
                  <h2>
                    {section === 1
                      ? 'Пока нет своих видео'
                      : section === 2
                        ? 'Избранное пока пусто'
                        : 'Видео не найдены'}
                  </h2>
                  <p>
                    {section === 1
                      ? 'Создайте канал и добавьте первое видео.'
                      : 'Попробуйте другой запрос или добавьте видео из каталога.'}
                  </p>
                </div>
              )}
              {section < 2 && data.page.nextCursor && (
                <div className="load-more">
                  <button className="btn" disabled={busy} onClick={more}>
                    {busy ? 'Загрузка…' : 'Показать ещё'}
                  </button>
                </div>
              )}
            </>
          )}
          {section === 3 && (
            <div className="playlist-layout">
              <div className="playlist-list">
                {data.playlists.map((p) => (
                  <button
                    key={p.id}
                    className={activePlaylist === p.id ? 'selected' : ''}
                    onClick={() => setSelected(p.id)}
                  >
                    <span className="playlist-mark">≡</span>
                    <span>
                      <strong>{p.title}</strong>
                      <small>{p.itemCount} видео</small>
                    </span>
                  </button>
                ))}
              </div>
              <PlaylistDetail
                playlistId={activePlaylist}
                user={user}
                revision={revision}
                onChange={refresh}
                onPick={(p) => setModal({ kind: 'pick', playlist: p })}
                onEdit={(p) => setModal({ kind: 'playlist', item: p })}
                onDelete={(p) =>
                  confirm(
                    `Удалить плейлист «${p.title}»? Видео останутся в библиотеке.`,
                    () =>
                      request(`/me/playlists/${p.id}`, {
                        user,
                        method: 'DELETE'
                      })
                  )
                }
              />
            </div>
          )}
          {section === 4 && (
            <div className="resource-list">
              {data.channels.map((c) => {
                const percent = BigInt(c.quotaBytes)
                  ? Number(
                      (BigInt(c.usedBytes) * 10000n) / BigInt(c.quotaBytes)
                    ) / 100
                  : 0
                return (
                  <article className="resource-row" key={c.id}>
                    <div className="resource-main">
                      <div className="row-title">
                        <h2>{c.title}</h2>
                        {own(c) && <span className="badge">Ваш канал</span>}
                      </div>
                      <p className="hint">
                        {c.ownerName} · {c.videoCount} видео
                      </p>
                      <div className="quota">
                        <div>
                          <span style={{ width: `${percent}%` }} />
                        </div>
                        <small>
                          Занято {bytes(c.usedBytes)} из {bytes(c.quotaBytes)} ·
                          свободно {bytes(c.remainingBytes)}
                        </small>
                      </div>
                    </div>
                    {own(c) && (
                      <div className="row-actions">
                        <button
                          className="btn"
                          onClick={() => setModal({ kind: 'channel', item: c })}
                        >
                          Переименовать
                        </button>
                        <button
                          className="btn danger"
                          disabled={busy || c.videoCount > 0}
                          title={
                            c.videoCount
                              ? 'Канал с видео защищён от удаления'
                              : 'Удалить пустой канал'
                          }
                          onClick={() =>
                            confirm(`Удалить пустой канал «${c.title}»?`, () =>
                              request(`/channels/${c.id}`, {
                                user,
                                method: 'DELETE'
                              })
                            )
                          }
                        >
                          Удалить
                        </button>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
          {section === 5 && (
            <>
              <p className="hint section-hint">
                Теги общие для всех пользователей. Используемый тег можно
                переименовать; удалить — после снятия со всех видео.
              </p>
              <div className="resource-list">
                {data.tags.map((t) => (
                  <article className="resource-row" key={t.id}>
                    <div className="resource-main">
                      <h2>
                        <span className="hash">#</span>
                        {t.name}
                      </h2>
                      <p className="hint">
                        Используется в {t.videoCount} видео
                      </p>
                    </div>
                    <div className="row-actions">
                      <button
                        className="btn"
                        onClick={() => setModal({ kind: 'tag', item: t })}
                      >
                        Переименовать
                      </button>
                      <button
                        className="btn danger"
                        disabled={busy || t.videoCount > 0}
                        onClick={() =>
                          confirm(`Удалить тег «${t.name}»?`, () =>
                            request(`/tags/${t.id}`, { user, method: 'DELETE' })
                          )
                        }
                      >
                        Удалить
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          {section === 6 && (
            <>
              <p className="hint section-hint">
                Это demo-пользователи. Переключение меняет владельца каналов,
                видео, избранного и плейлистов.
              </p>
              <div className="resource-list">
                {users.map((u) => (
                  <article className="resource-row" key={u.id}>
                    <span className="avatar">
                      {u.displayName.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="resource-main">
                      <div className="row-title">
                        <h2>{u.displayName}</h2>
                        {u.id === Number(user) && (
                          <span className="badge">Текущий профиль</span>
                        )}
                      </div>
                      <p className="hint">{u.email}</p>
                    </div>
                    <div className="row-actions">
                      {u.id === Number(user) ? (
                        <>
                          <button
                            className="btn"
                            onClick={() =>
                              setModal({ kind: 'user', item: currentUser })
                            }
                          >
                            Редактировать
                          </button>
                          <button
                            className="btn danger"
                            disabled={busy || users.length < 2}
                            onClick={() =>
                              confirm(
                                'Удалить свой профиль? Удаление невозможно, пока у него есть каналы или плейлисты.',
                                async () => {
                                  await request('/me', {
                                    user,
                                    method: 'DELETE'
                                  })
                                  setUser(
                                    users.find(
                                      (other) => other.id !== Number(user)
                                    ).id
                                  )
                                }
                              )
                            }
                          >
                            Удалить профиль
                          </button>
                        </>
                      ) : (
                        <button className="btn" onClick={() => setUser(u.id)}>
                          Выбрать пользователя
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </>
      )}
      {modal &&
        data &&
        ['video', 'channel', 'tag', 'playlist', 'user'].includes(
          modal.kind
        ) && (
          <Editor
            key={`${modal.kind}:${modal.item?.id || 'new'}`}
            kind={modal.kind}
            item={modal.item}
            refs={data}
            user={user}
            onClose={() => setModal(null)}
            onSaved={saved}
          />
        )}
      {modal?.kind === 'confirm' && (
        <Modal
          title="Подтвердите удаление"
          onClose={() => !busy && setModal(null)}
        >
          <p>{modal.title}</p>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button
              className="btn"
              disabled={busy}
              onClick={() => setModal(null)}
            >
              Отмена
            </button>
            <button
              className="btn danger"
              disabled={busy}
              onClick={() => action(modal.run, 'Удалено')}
            >
              {busy ? 'Удаляем…' : 'Удалить'}
            </button>
          </div>
        </Modal>
      )}
      {modal?.kind === 'pick' && (
        <VideoPicker
          user={user}
          playlist={modal.playlist}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            refresh()
            setNotice('Видео добавлено в плейлист')
          }}
        />
      )}
      {modal?.kind === 'addToPlaylist' && (
        <Modal
          title="Добавить в плейлист"
          onClose={() => !busy && setModal(null)}
        >
          <p>{modal.video.title}</p>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {data.playlists.length ? (
            <>
              <Field label="Плейлист">
                <select
                  value={chosenPlaylist}
                  onChange={(e) => setChosenPlaylist(e.target.value)}
                >
                  {data.playlists.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </Field>
              <button
                className="btn btn-primary"
                disabled={busy || !chosenPlaylist}
                onClick={() =>
                  action(
                    () =>
                      request(`/me/playlists/${chosenPlaylist}/items`, {
                        user,
                        method: 'POST',
                        body: { videoId: modal.video.id }
                      }),
                    'Видео добавлено в плейлист'
                  )
                }
              >
                Добавить
              </button>
            </>
          ) : (
            <>
              <p className="hint">У вас пока нет плейлистов.</p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setModal(null)
                  navigate('/playlists')
                }}
              >
                Перейти к плейлистам
              </button>
            </>
          )}
        </Modal>
      )}
    </div>
  )
}
