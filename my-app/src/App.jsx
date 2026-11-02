import { useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { request } from './api.js'
import { SessionContext } from './session.js'
import Workspace from './pages/Workspace.jsx'
import VideoPage from './pages/VideoPage.jsx'
import './App.css'
const sections = [
  ['/', 'Каталог'],
  ['/mine', 'Мои видео'],
  ['/favorites', 'Избранное'],
  ['/playlists', 'Плейлисты'],
  ['/channels', 'Каналы'],
  ['/tags', 'Теги'],
  ['/users', 'Пользователи']
]
function App() {
  const [user, setUserValue] = useState(
    () => localStorage.getItem('vidnest-user') || '1'
  )
  const [users, setUsers] = useState([]),
    [revision, setRevision] = useState(0),
    [error, setError] = useState('')
  const setUser = (value) => {
    localStorage.setItem('vidnest-user', String(value))
    setUserValue(String(value))
    setError('')
  }
  useEffect(() => {
    const controller = new AbortController()
    request('/users', { user, signal: controller.signal })
      .then(setUsers)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message)
      })
    return () => controller.abort()
  }, [user, revision])
  return (
    <SessionContext.Provider
      value={{
        user,
        users,
        setUser,
        refreshUsers: () => setRevision((v) => v + 1)
      }}
    >
      <div className="layout">
        <aside className="sidebar">
          <NavLink to="/" className="logo">
            Vid<span>Nest</span>
          </NavLink>
          <p className="sidebar-caption">Ваша видеотека</p>
          <nav aria-label="Основная навигация">
            {sections.map(([path, title], i) => (
              <NavLink key={path} to={path} end={path === '/'}>
                <span className="nav-number">0{i + 1}</span>
                {title}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-foot">Учебный видеохостинг</div>
        </aside>
        <div className="main-area">
          <header className="session-bar">
            <span className="session-mode">Демонстрационная среда</span>
            <label className="user-switch">
              Текущий пользователь
              <select
                aria-label="Текущий пользователь"
                value={user}
                onChange={(e) => setUser(e.target.value)}
              >
                {!users.some((u) => String(u.id) === user) && (
                  <option value={user}>Пользователь {user}</option>
                )}
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            </label>
          </header>
          {error && (
            <div className="form-error" role="alert">
              {error}{' '}
              <button className="btn" onClick={() => setUser('1')}>
                Вернуться к пользователю 1
              </button>
            </div>
          )}
          <main>
            <Routes>
              {sections.map(([path], i) => (
                <Route
                  key={path}
                  path={path}
                  element={<Workspace key={`${user}:${i}`} section={i} />}
                />
              ))}
              <Route path="/video/:id" element={<VideoPage key={user} />} />
              <Route
                path="*"
                element={
                  <p className="empty-state">
                    Страница не найдена. Выберите раздел меню.
                  </p>
                }
              />
            </Routes>
          </main>
        </div>
      </div>
    </SessionContext.Provider>
  )
}
export default App
