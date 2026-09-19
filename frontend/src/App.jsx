import { useCallback, useEffect, useState } from 'react'
import EnrollmentForm from './EnrollmentForm'
import EnrollmentActions from './EnrollmentActions'
import AdvancedQuery from './AdvancedQuery'
import { apiUrl } from './api'

const columns = [
  { key: 'student_nim', label: 'NIM' },
  { key: 'student_name', label: 'Nama Mahasiswa' },
  { key: 'course_code', label: 'Kode MK' },
  { key: 'course_name', label: 'Nama MK' },
  { key: 'semester', label: 'Semester' },
  { key: 'academic_year', label: 'Tahun Ajaran' },
  { key: 'status', label: 'Status' },
]

function App() {
  const [advanced, setAdvanced] = useState({ filters: [], logic: 'and', orders: [] })
  const [refreshKey, setRefreshKey] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [semester, setSemester] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [direction, setDirection] = useState('asc')

  const buildParams = useCallback((includePage = true) => {
    const params = new URLSearchParams()

    if (includePage) {
      params.set('page', String(page))
      params.set('page_size', String(pageSize))
    }

    if (search) params.set('search', search)
    if (status) params.set('status', status)
    if (semester) params.set('semester', semester)

    if (sortBy) {
      params.set('sort_by', sortBy)
      params.set('direction', direction)
    }

    if (advanced.filters.length > 0) {
      params.set('filter_logic', advanced.logic)

      advanced.filters.forEach((filter, index) => {
        params.set(`filters[${index}][column]`, filter.column)
        params.set(`filters[${index}][operator]`, filter.operator)
        params.set(`filters[${index}][value]`, filter.value)
      })
    }

    advanced.orders.forEach((order, index) => {
      params.set(`orders[${index}][column]`, order.column)
      params.set(`orders[${index}][direction]`, order.direction)
    })

    return params
  }, [page, pageSize, search, status, semester, sortBy, direction, advanced])

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      setSearch(searchInput.trim())
    }, 400)

    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    const controller = new AbortController()

    async function loadEnrollments() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(apiUrl(`/api/enrollments?${buildParams()}`), {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Gagal mengambil data (HTTP ${response.status}).`)
        }

        setResult(await response.json())
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadEnrollments()

    return () => controller.abort()
  }, [buildParams, refreshKey])

  function handleSort(column) {
    if (sortBy === column) {
      setDirection((current) => current === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setDirection('asc')
    }

    setPage(1)
  }

  function refreshTable() {
    setPage(1)
    setRefreshKey((current) => current + 1)
  }

  function confirmExport(event) {
    const hasFilter = search || status || semester || advanced.filters.length > 0

    if (!hasFilter && !window.confirm('Tanpa filter, semua data KRS akan diunduh. Lanjutkan?')) {
      event.preventDefault()
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand-mark" aria-hidden="true">K</div>
          <div className="brand-copy">
            <strong>KRS Akademik</strong>
            <span>Manajemen pengambilan mata kuliah</span>
          </div>
          <span className="topbar-label">Panel administrasi</span>
        </div>
      </header>

      <main className="page-container">
        <div className="page-heading">
          <div>
            <span className="eyebrow">DATA AKADEMIK</span>
            <h1>Daftar KRS Mahasiswa</h1>
            <p>Kelola pengambilan mata kuliah dalam satu halaman.</p>
          </div>
          <a
            className="button button-outline"
            href={apiUrl(`/api/enrollments/export?${buildParams(false)}`)}
            onClick={confirmExport}
          >
            <span aria-hidden="true">↓</span> Unduh CSV
          </a>
        </div>

        <details className="create-panel">
          <summary><span aria-hidden="true">＋</span> Tambah KRS</summary>
          <EnrollmentForm onCreated={refreshTable} />
        </details>

        <section className="workspace-card" aria-label="Daftar KRS">
          <div className="workspace-heading">
            <div>
              <h2>Data pengambilan mata kuliah</h2>
              <p>Cari, filter, dan kelola data KRS mahasiswa.</p>
            </div>
            {result && <span className="total-badge">{Number(result.total).toLocaleString('id-ID')} data</span>}
          </div>

          <div className="toolbar">
            <label className="toolbar-field search-field">
              <span>Cari data</span>
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="NIM, nama mahasiswa, atau kode MK"
                aria-label="Cari KRS"
              />
            </label>

            <label className="toolbar-field">
              <span>Status</span>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value)
                  setPage(1)
                }}
              >
                <option value="">Semua status</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </label>

            <label className="toolbar-field">
              <span>Semester</span>
              <select
                value={semester}
                onChange={(event) => {
                  setSemester(event.target.value)
                  setPage(1)
                }}
              >
                <option value="">Semua semester</option>
                <option value="GANJIL">Ganjil</option>
                <option value="GENAP">Genap</option>
              </select>
            </label>

            <label className="toolbar-field page-size-field">
              <span>Baris per halaman</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value))
                  setPage(1)
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>

          <AdvancedQuery
            onApply={(value) => {
              setAdvanced(value)
              setSortBy('')
              setPage(1)
            }}
          />

          {loading && <p className="notice" role="status">Memuat data...</p>}
          {error && <p className="notice notice-error" role="alert">{error}</p>}

          {!loading && !error && result && (
            <>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {columns.map((column) => (
                        <th key={column.key}>
                          <button
                            className="sort-button"
                            type="button"
                            onClick={() => handleSort(column.key)}
                            aria-label={`Urutkan berdasarkan ${column.label}`}
                          >
                            {column.label}
                            <span aria-hidden="true" className="sort-icon">
                              {sortBy === column.key ? (direction === 'asc' ? '↑' : '↓') : '↕'}
                            </span>
                          </button>
                        </th>
                      ))}
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((row) => (
                      <tr key={row.id}>
                        <td className="cell-strong">{row.student_nim}</td>
                        <td>{row.student_name}</td>
                        <td><span className="course-code">{row.course_code}</span></td>
                        <td>{row.course_name}</td>
                        <td>{row.semester}</td>
                        <td>{row.academic_year}</td>
                        <td><span className={`status-badge status-${row.status.toLowerCase()}`}>{row.status}</span></td>
                        <td className="action-cell"><EnrollmentActions row={row} onChanged={refreshTable} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {result.data.length === 0 && (
                <div className="empty-state">Data KRS tidak ditemukan. Coba ubah pencarian atau filter.</div>
              )}

              <div className="table-footer">
                <span>{Number(result.total).toLocaleString('id-ID')} data ditemukan</span>
                <div className="pagination">
                  <button type="button" onClick={() => setPage((current) => current - 1)} disabled={page <= 1}>
                    ← Sebelumnya
                  </button>
                  <span>Halaman {result.current_page} dari {result.last_page}</span>
                  <button type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= result.last_page}>
                    Berikutnya →
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
