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

const apiFieldByInput = {
  studentMode: 'student.mode',
  nim: 'student.nim',
  studentName: 'student.name',
  email: 'student.email',
  courseMode: 'course.mode',
  courseCode: 'course.code',
  courseName: 'course.name',
  credits: 'course.credits',
  academicYear: 'enrollment.academic_year',
  semester: 'enrollment.semester',
  status: 'enrollment.status',
}

const inputByApiField = Object.fromEntries(
  Object.entries(apiFieldByInput).map(([input, field]) => [field, input]),
)

function firstError(errors, field) {
  const messages = errors[field]

  if (Array.isArray(messages)) return messages[0]
  return messages ?? ''
}

function FieldError({ errors, field }) {
  const message = firstError(errors, field)

  if (!message) return null

  return (
    <small id={`${field}-error`} className="field-error" role="alert">
      {message}
    </small>
  )
}

function EnrollmentForm({ onCreated }) {
  const [form, setForm] = useState(initialForm)
  const [courses, setCourses] = useState([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadCourses() {
      setCoursesLoading(true)

      try {
        const response = await fetch('/api/courses/options', {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Daftar mata kuliah gagal dimuat.')
        }

        setCourses(await response.json())
      } catch (error) {
        if (error.name !== 'AbortError') {
          setMessage(error.message)
          setMessageType('error')
        }
      } finally {
        if (!controller.signal.aborted) setCoursesLoading(false)
      }
    }

    loadCourses()
    return () => controller.abort()
  }, [])

  function change(event) {
    const { name, value } = event.target
    const apiField = apiFieldByInput[name]

    setForm((current) => ({
      ...current,
      [name]: name === 'courseCode' ? value.toUpperCase() : value,
      ...(name === 'courseMode'
        ? { courseCode: '', courseName: '', credits: 3 }
        : {}),
      ...(name === 'studentMode'
        ? { nim: '', studentName: '', email: '' }
        : {}),
    }))

    setErrors((current) => {
      const next = { ...current }
      delete next[apiField]
      delete next.enrollment

      if (name === 'studentMode') {
        delete next['student.nim']
        delete next['student.name']
        delete next['student.email']
      }

      if (name === 'courseMode') {
        delete next['course.code']
        delete next['course.name']
        delete next['course.credits']
      }

      return next
    })

    if (messageType === 'success') {
      setMessage('')
      setMessageType('')
    }
  }

  function validateForm() {
    const next = {}
    const nim = form.nim.trim()
    const academicYear = form.academicYear.trim()
    const courseCode = form.courseCode.trim().toUpperCase()

    if (!nim) {
      next['student.nim'] = ['NIM wajib diisi.']
    } else if (!/^[0-9]{8,12}$/.test(nim)) {
      next['student.nim'] = ['NIM harus terdiri dari 8 sampai 12 digit angka tanpa spasi.']
    }

    if (form.studentMode === 'new') {
      const name = form.studentName.trim()
      const email = form.email.trim()

      if (!name) {
        next['student.name'] = ['Nama mahasiswa wajib diisi.']
      } else if (name.length < 3 || name.length > 100) {
        next['student.name'] = ['Nama mahasiswa harus terdiri dari 3 sampai 100 karakter.']
      }

      if (!email) {
        next['student.email'] = ['Email wajib diisi.']
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        next['student.email'] = ['Masukkan alamat email yang valid.']
      } else if (email.length > 255) {
        next['student.email'] = ['Email tidak boleh lebih dari 255 karakter.']
      }
    }

    if (!courseCode) {
      next['course.code'] = [
        form.courseMode === 'existing'
          ? 'Pilih mata kuliah.'
          : 'Kode mata kuliah wajib diisi.',
      ]
    } else if (form.courseMode === 'new' && !/^[A-Z]{2,4}[0-9]{3}$/.test(courseCode)) {
      next['course.code'] = ['Kode MK harus berupa 2–4 huruf kapital dan 3 angka, misalnya IF101.']
    }

    if (form.courseMode === 'new') {
      const name = form.courseName.trim()
      const credits = Number(form.credits)

      if (!name) {
        next['course.name'] = ['Nama mata kuliah wajib diisi.']
      } else if (name.length < 3 || name.length > 120) {
        next['course.name'] = ['Nama mata kuliah harus terdiri dari 3 sampai 120 karakter.']
      }

      if (!Number.isInteger(credits) || credits < 1 || credits > 6) {
        next['course.credits'] = ['SKS harus berupa bilangan bulat antara 1 dan 6.']
      }
    }

    if (!academicYear) {
      next['enrollment.academic_year'] = ['Tahun ajaran wajib diisi.']
    } else if (!/^[0-9]{4}\/[0-9]{4}$/.test(academicYear)) {
      next['enrollment.academic_year'] = ['Gunakan format YYYY/YYYY, misalnya 2026/2027.']
    }

    if (!['GANJIL', 'GENAP'].includes(form.semester)) {
      next['enrollment.semester'] = ['Semester yang dipilih tidak valid.']
    }

    if (!['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].includes(form.status)) {
      next['enrollment.status'] = ['Status yang dipilih tidak valid.']
    }

    return next
  }

  function focusFirstError(nextErrors) {
    const firstField = Object.keys(nextErrors)[0]
    const inputName = inputByApiField[firstField]

    if (inputName) {
      requestAnimationFrame(() => {
        document.querySelector(`[name="${inputName}"]`)?.focus()
      })
    }
  }

  async function submit(event) {
    event.preventDefault()

    const frontendErrors = validateForm()
    if (Object.keys(frontendErrors).length > 0) {
      setErrors(frontendErrors)
      setMessage('Periksa kembali kolom yang ditandai.')
      setMessageType('error')
      focusFirstError(frontendErrors)
      return
    }

    setSaving(true)
    setErrors({})
    setMessage('')
    setMessageType('')

    const student = {
      mode: form.studentMode,
      nim: form.nim.trim(),
    }

    if (form.studentMode === 'new') {
      student.name = form.studentName.trim()
      student.email = form.email.trim()
    }

    const course = {
      mode: form.courseMode,
      code: form.courseCode.trim().toUpperCase(),
    }

    if (form.courseMode === 'new') {
      course.name = form.courseName.trim()
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
            academic_year: form.academicYear.trim(),
            semester: form.semester,
            status: form.status,
          },
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        const backendErrors = result.errors ?? {}
        setErrors(backendErrors)
        setMessage(
          Object.keys(backendErrors).length > 0
            ? 'Periksa kembali kolom yang ditandai.'
            : (result.message ?? 'KRS gagal disimpan.'),
        )
        setMessageType('error')
        focusFirstError(backendErrors)
        return
      }

      setForm(initialForm)
      setErrors({})
      setMessage(result.message ?? 'KRS berhasil ditambahkan.')
      setMessageType('success')
      onCreated?.()
    } catch {
      setMessage('Tidak dapat terhubung ke API Laravel. Coba beberapa saat lagi.')
      setMessageType('error')
    } finally {
      setSaving(false)
    }
  }

  const fieldProps = (field) => ({
    'aria-invalid': Boolean(firstError(errors, field)),
    'aria-describedby': firstError(errors, field) ? `${field}-error` : undefined,
  })

  return (
    <section>
      <h2>Tambah KRS</h2>
      <p>Pilih data yang sudah tersedia atau buat data baru.</p>

      <form onSubmit={submit} noValidate>
        <div className="form-grid">
          <label>
            Mahasiswa
            <select name="studentMode" value={form.studentMode} onChange={change}>
              <option value="existing">Gunakan NIM yang sudah ada</option>
              <option value="new">Tambah mahasiswa baru</option>
            </select>
          </label>

          <label>
            NIM
            <input
              name="nim"
              inputMode="numeric"
              autoComplete="off"
              value={form.nim}
              onChange={change}
              placeholder="Contoh: 2155301080"
              {...fieldProps('student.nim')}
            />
            <FieldError errors={errors} field="student.nim" />
          </label>

          {form.studentMode === 'new' && (
            <>
              <label>
                Nama Mahasiswa
                <input
                  name="studentName"
                  value={form.studentName}
                  onChange={change}
                  maxLength={100}
                  {...fieldProps('student.name')}
                />
                <FieldError errors={errors} field="student.name" />
              </label>

              <label>
                Email
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={change}
                  maxLength={255}
                  placeholder="nama@email.com"
                  {...fieldProps('student.email')}
                />
                <FieldError errors={errors} field="student.email" />
              </label>
            </>
          )}

          <label>
            Mata Kuliah
            <select name="courseMode" value={form.courseMode} onChange={change}>
              <option value="existing">Pilih mata kuliah yang tersedia</option>
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
                disabled={coursesLoading}
                {...fieldProps('course.code')}
              >
                <option value="">
                  {coursesLoading ? 'Memuat mata kuliah...' : 'Pilih mata kuliah'}
                </option>
                {courses.map((course) => (
                  <option key={course.code} value={course.code}>
                    {course.code} — {course.name}
                  </option>
                ))}
              </select>
              <FieldError errors={errors} field="course.code" />
            </label>
          ) : (
            <>
              <label>
                Kode MK Baru
                <input
                  name="courseCode"
                  value={form.courseCode}
                  onChange={change}
                  maxLength={7}
                  placeholder="Contoh: IF101"
                  {...fieldProps('course.code')}
                />
                <FieldError errors={errors} field="course.code" />
              </label>

              <label>
                Nama MK Baru
                <input
                  name="courseName"
                  value={form.courseName}
                  onChange={change}
                  maxLength={120}
                  {...fieldProps('course.name')}
                />
                <FieldError errors={errors} field="course.name" />
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
                  step={1}
                  {...fieldProps('course.credits')}
                />
                <FieldError errors={errors} field="course.credits" />
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
              maxLength={9}
              {...fieldProps('enrollment.academic_year')}
            />
            <FieldError errors={errors} field="enrollment.academic_year" />
          </label>

          <label>
            Semester
            <select
              name="semester"
              value={form.semester}
              onChange={change}
              {...fieldProps('enrollment.semester')}
            >
              <option value="GANJIL">Ganjil</option>
              <option value="GENAP">Genap</option>
            </select>
            <FieldError errors={errors} field="enrollment.semester" />
          </label>

          <label>
            Status
            <select
              name="status"
              value={form.status}
              onChange={change}
              {...fieldProps('enrollment.status')}
            >
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <FieldError errors={errors} field="enrollment.status" />
          </label>
        </div>

        <FieldError errors={errors} field="enrollment" />

        <button type="submit" disabled={saving} style={{ marginTop: 20 }}>
          {saving ? 'Menyimpan...' : 'Simpan KRS'}
        </button>
      </form>

      {message && (
        <p
          className={`form-message ${messageType === 'error' ? 'form-message-error' : 'form-message-success'}`}
          role={messageType === 'error' ? 'alert' : 'status'}
        >
          {message}
        </p>
      )}
    </section>
  )
}

export default EnrollmentForm
