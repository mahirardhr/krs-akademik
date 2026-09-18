import { useEffect, useState } from 'react'

const initialForm = {
  studentMode: 'existing',
  nim: '',
  studentName: '',
  email: '',
  courseMode: 'existing',
  courseCode: '',
  courseName: '',
  credits: 3,
  academicYear: '',
  semester: 'GANJIL',
  status: 'DRAFT',
}

function EnrollmentForm({ onCreated }) {
  const [form, setForm] = useState(initialForm)
  const [courses, setCourses] = useState([])
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/courses/options', {
      headers: { Accept: 'application/json' },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Gagal mengambil daftar mata kuliah.')
        }

        return response.json()
      })
      .then((data) => setCourses(data))
      .catch((error) => setMessage(error.message))
  }, [])

  function change(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
      // Saat berganti cara memilih MK, kosongkan kode sebelumnya.
      ...(name === 'courseMode' ? { courseCode: '' } : {}),
    }))
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    setMessage('')

    const student = {
      mode: form.studentMode,
      nim: form.nim,
    }

    if (form.studentMode === 'new') {
      student.name = form.studentName
      student.email = form.email
    }

    const course = {
      mode: form.courseMode,
      code: form.courseCode,
    }

    if (form.courseMode === 'new') {
      course.name = form.courseName
      course.credits = Number(form.credits)
    }

    try {
      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          student,
          course,
          enrollment: {
            academic_year: form.academicYear,
            semester: form.semester,
            status: form.status,
          },
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setErrors(result.errors ?? {})
        setMessage(
          result.errors
            ? 'Periksa kembali isian form.'
            : (result.message ?? 'Gagal menyimpan KRS.'),
        )
        return
      }

      setForm(initialForm)
      setMessage('KRS berhasil ditambahkan.')
      onCreated()
    } catch {
      setMessage('Tidak dapat terhubung ke API Laravel.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h2>Tambah KRS</h2>
      <p>Pilih data yang sudah ada atau buat data baru.</p>

      <form onSubmit={submit}>
        <div className="form-grid">
          <label>
            Mahasiswa
            <select
              name="studentMode"
              value={form.studentMode}
              onChange={change}
            >
              <option value="existing">Gunakan NIM yang sudah ada</option>
              <option value="new">Tambah mahasiswa baru</option>
            </select>
          </label>

          <label>
            NIM
            <input
              name="nim"
              value={form.nim}
              onChange={change}
              pattern="[0-9]{8,12}"
              title="NIM harus terdiri dari 8–12 digit angka."
              required
            />
          </label>

          {form.studentMode === 'new' && (
            <>
              <label>
                Nama Mahasiswa
                <input
                  name="studentName"
                  value={form.studentName}
                  onChange={change}
                  minLength={3}
                  maxLength={100}
                  required
                />
              </label>

              <label>
                Email
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={change}
                  required
                />
              </label>
            </>
          )}

          <label>
            Mata Kuliah
            <select
              name="courseMode"
              value={form.courseMode}
              onChange={change}
            >
              <option value="existing">Pilih mata kuliah yang ada</option>
              <option value="new">Tambah mata kuliah baru</option>
            </select>
          </label>

          {form.courseMode === 'existing' ? (
            <label>
              Kode MK
              <select
                name="courseCode"
                value={form.courseCode}
                onChange={change}
                required
              >
                <option value="">Pilih mata kuliah</option>
                {courses.map((course) => (
                  <option key={course.code} value={course.code}>
                    {course.code} — {course.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label>
                Kode MK Baru
                <input
                  name="courseCode"
                  value={form.courseCode}
                  onChange={change}
                  pattern="[A-Z]{2,4}[0-9]{3}"
                  title="Contoh: IF101. Gunakan huruf kapital."
                  required
                />
              </label>

              <label>
                Nama MK Baru
                <input
                  name="courseName"
                  value={form.courseName}
                  onChange={change}
                  minLength={3}
                  maxLength={120}
                  required
                />
              </label>

              <label>
                SKS
                <input
                  name="credits"
                  type="number"
                  value={form.credits}
                  onChange={change}
                  min={1}
                  max={6}
                  required
                />
              </label>
            </>
          )}

          <label>
            Tahun Ajaran
            <input
              name="academicYear"
              value={form.academicYear}
              onChange={change}
              placeholder="2026/2027"
              pattern="[0-9]{4}/[0-9]{4}"
              required
            />
          </label>

          <label>
            Semester
            <select
              name="semester"
              value={form.semester}
              onChange={change}
            >
              <option value="GANJIL">Ganjil</option>
              <option value="GENAP">Genap</option>
            </select>
          </label>

          <label>
            Status
            <select name="status" value={form.status} onChange={change}>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </label>
        </div>

        <button type="submit" disabled={saving} style={{ marginTop: 20 }}>
          {saving ? 'Menyimpan...' : 'Simpan KRS'}
        </button>
      </form>

      {message && (
        <p role="status" style={{ marginTop: 14 }}>
          {message}
        </p>
      )}

      {Object.entries(errors).length > 0 && (
        <ul style={{ color: 'crimson' }}>
          {Object.entries(errors).map(([field, messages]) => (
            <li key={field}>
              {field}: {messages.join(', ')}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default EnrollmentForm