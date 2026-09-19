import { useCallback, useEffect, useState } from 'react'

function firstError(errors, field) {
  const messages = errors[field]

  if (Array.isArray(messages)) return messages[0]
  return messages ?? ''
}

function FieldError({ errors, field }) {
  const message = firstError(errors, field)

  if (!message) return null

  return (
    <small id={`edit-${field}-error`} className="field-error" role="alert">
      {message}
    </small>
  )
}

function EnrollmentActions({ row, onChanged }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    academic_year: row.academic_year,
    semester: row.semester,
    status: row.status,
  })
  const [busyAction, setBusyAction] = useState('')
  const [errors, setErrors] = useState({})
  const [actionError, setActionError] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const closeEdit = useCallback(() => {
    if (busyAction) return
    setEditing(false)
    setErrors({})
  }, [busyAction])

  useEffect(() => {
    if (!editing && !confirmingDelete) return undefined

    function closeWithEscape(event) {
      if (event.key !== 'Escape' || busyAction) return

      if (editing) closeEdit()
      if (confirmingDelete) setConfirmingDelete(false)
    }

    document.addEventListener('keydown', closeWithEscape)
    return () => document.removeEventListener('keydown', closeWithEscape)
  }, [editing, confirmingDelete, busyAction, closeEdit])

  function openEdit() {
    setForm({
      academic_year: row.academic_year,
      semester: row.semester,
      status: row.status,
    })
    setErrors({})
    setActionError('')
    setEditing(true)
  }

  function change(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => {
      const next = { ...current }
      delete next[name]
      delete next.enrollment
      return next
    })
  }

  function validateForm() {
    const next = {}
    const academicYear = form.academic_year.trim()

    if (!academicYear) {
      next.academic_year = ['Tahun ajaran wajib diisi.']
    } else if (!/^[0-9]{4}\/[0-9]{4}$/.test(academicYear)) {
      next.academic_year = ['Gunakan format YYYY/YYYY, misalnya 2026/2027.']
    }

    if (!['GANJIL', 'GENAP'].includes(form.semester)) {
      next.semester = ['Semester yang dipilih tidak valid.']
    }

    if (!['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].includes(form.status)) {
      next.status = ['Status yang dipilih tidak valid.']
    }

    return next
  }

  async function save(event) {
    event.preventDefault()

    const frontendErrors = validateForm()
    if (Object.keys(frontendErrors).length > 0) {
      setErrors(frontendErrors)
      requestAnimationFrame(() => {
        document.querySelector('.edit-form [aria-invalid="true"]')?.focus()
      })
      return
    }

    setBusyAction('save')
    setErrors({})
    setActionError('')

    try {
      const response = await fetch(`/api/enrollments/${row.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          academic_year: form.academic_year.trim(),
          semester: form.semester,
          status: form.status,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.errors) {
          setErrors(result.errors)
        } else {
          setActionError(result.message ?? 'KRS gagal diperbarui.')
        }
        return
      }

      setEditing(false)
      onChanged?.()
    } catch {
      setActionError('Tidak dapat terhubung ke API Laravel. Coba beberapa saat lagi.')
    } finally {
      setBusyAction('')
    }
  }

  async function remove() {
    setBusyAction('delete')
    setActionError('')

    try {
      const response = await fetch(`/api/enrollments/${row.id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      })

      const result = await response.json()

      if (!response.ok) {
        setActionError(result.message ?? 'KRS gagal dihapus.')
        return
      }

      setConfirmingDelete(false)
      onChanged?.()
    } catch {
      setActionError('Tidak dapat terhubung ke API Laravel. Coba beberapa saat lagi.')
    } finally {
      setBusyAction('')
    }
  }

  const fieldProps = (field) => ({
    'aria-invalid': Boolean(firstError(errors, field)),
    'aria-describedby': firstError(errors, field)
      ? `edit-${field}-error`
      : undefined,
  })

  return (
    <>
      <div className="action-buttons">
        <button type="button" onClick={openEdit} disabled={Boolean(busyAction)}>
          Edit
        </button>
        <button
          type="button"
          className="button-danger"
          onClick={() => {
            setActionError('')
            setConfirmingDelete(true)
          }}
          disabled={Boolean(busyAction)}
        >
          {busyAction === 'delete' ? 'Menghapus...' : 'Hapus'}
        </button>
      </div>

      {actionError && <p className="row-error" role="alert">{actionError}</p>}

      {editing && (
        <div className="edit-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeEdit()
        }}>
          <div
            className="edit-box"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`edit-title-${row.id}`}
          >
            <div className="edit-heading">
              <div>
                <h2 id={`edit-title-${row.id}`}>Edit KRS</h2>
                <p className="edit-context">
                  {row.student_nim} — {row.student_name}<br />
                  {row.course_code} — {row.course_name}
                </p>
              </div>
              <button
                type="button"
                className="close-button"
                onClick={closeEdit}
                disabled={Boolean(busyAction)}
                aria-label="Tutup form edit"
              >
                ×
              </button>
            </div>

            <form onSubmit={save} className="edit-form" noValidate>
              <label>
                Tahun Ajaran
                <input
                  name="academic_year"
                  value={form.academic_year}
                  onChange={change}
                  maxLength={9}
                  placeholder="2026/2027"
                  autoFocus
                  {...fieldProps('academic_year')}
                />
                <FieldError errors={errors} field="academic_year" />
              </label>

              <label>
                Semester
                <select
                  name="semester"
                  value={form.semester}
                  onChange={change}
                  {...fieldProps('semester')}
                >
                  <option value="GANJIL">Ganjil</option>
                  <option value="GENAP">Genap</option>
                </select>
                <FieldError errors={errors} field="semester" />
              </label>

              <label>
                Status
                <select
                  name="status"
                  value={form.status}
                  onChange={change}
                  {...fieldProps('status')}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <FieldError errors={errors} field="status" />
              </label>

              <FieldError errors={errors} field="enrollment" />

              {actionError && (
                <p className="form-message form-message-error" role="alert">
                  {actionError}
                </p>
              )}

              <div className="edit-buttons">
                <button type="button" onClick={closeEdit} disabled={Boolean(busyAction)}>
                  Batal
                </button>
                <button
                  type="submit"
                  className="button-primary"
                  disabled={Boolean(busyAction)}
                >
                  {busyAction === 'save' ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmingDelete && (
        <div
          className="edit-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busyAction) {
              setConfirmingDelete(false)
            }
          }}
        >
          <div
            className="delete-box"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`delete-title-${row.id}`}
            aria-describedby={`delete-description-${row.id}`}
          >
            <div className="delete-icon" aria-hidden="true">!</div>
            <h2 id={`delete-title-${row.id}`}>Hapus data KRS?</h2>
            <p id={`delete-description-${row.id}`}>
              KRS <strong>{row.student_nim}</strong> untuk mata kuliah{' '}
              <strong>{row.course_code}</strong> ({row.academic_year},{' '}
              {row.semester}) akan dihapus secara permanen.
            </p>
            <p className="delete-note">
              Data mahasiswa dan mata kuliah tetap tersimpan.
            </p>

            {actionError && (
              <p className="form-message form-message-error" role="alert">
                {actionError}
              </p>
            )}

            <div className="delete-actions">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={Boolean(busyAction)}
                autoFocus
              >
                Batal
              </button>
              <button
                type="button"
                className="button-danger button-danger-solid"
                onClick={remove}
                disabled={Boolean(busyAction)}
              >
                {busyAction === 'delete' ? 'Menghapus...' : 'Ya, Hapus KRS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default EnrollmentActions
