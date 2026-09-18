import { useState } from 'react'

function EnrollmentActions({ row, onChanged }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    academic_year: row.academic_year,
    semester: row.semester,
    status: row.status,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      const response = await fetch(`/api/enrollments/${row.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(form),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.message ?? 'Gagal memperbarui KRS.')
        return
      }

      setEditing(false)
      onChanged()
    } catch {
      setError('Tidak dapat terhubung ke API Laravel.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm(`Hapus KRS ${row.student_nim} - ${row.course_code}?`)) {
      return
    }

    setBusy(true)
    setError('')

    try {
      const response = await fetch(`/api/enrollments/${row.id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        const result = await response.json()
        setError(result.message ?? 'Gagal menghapus KRS.')
        return
      }

      onChanged()
    } catch {
      setError('Tidak dapat terhubung ke API Laravel.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => setEditing(true)} disabled={busy}>
        Edit
      </button>{' '}
      <button type="button" onClick={remove} disabled={busy}>
        Hapus
      </button>

      {error && <p role="alert" style={{ color: 'crimson', marginTop: 8 }}>{error}</p>}

      {editing && (
        <div className="edit-overlay">
          <div className="edit-box" role="dialog" aria-modal="true" aria-label="Edit KRS">
            <h2>Edit KRS</h2>
            <p>{row.student_nim} — {row.course_code}</p>

            <form onSubmit={save} className="edit-form">
              <label>
                Tahun Ajaran
                <input
                  value={form.academic_year}
                  onChange={(event) => setForm({
                    ...form,
                    academic_year: event.target.value,
                  })}
                  pattern="[0-9]{4}/[0-9]{4}"
                  required
                />
              </label>

              <label>
                Semester
                <select
                  value={form.semester}
                  onChange={(event) => setForm({
                    ...form,
                    semester: event.target.value,
                  })}
                >
                  <option value="GANJIL">Ganjil</option>
                  <option value="GENAP">Genap</option>
                </select>
              </label>

              <label>
                Status
                <select
                  value={form.status}
                  onChange={(event) => setForm({
                    ...form,
                    status: event.target.value,
                  })}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </label>

              <div className="edit-buttons">
                <button type="button" onClick={() => setEditing(false)} disabled={busy}>
                  Batal
                </button>
                <button type="submit" disabled={busy}>
                  {busy ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default EnrollmentActions