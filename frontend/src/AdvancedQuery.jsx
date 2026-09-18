import { useState } from 'react'

const emptyFields = {
  student_nim: '',
  student_name: '',
  course_code: '',
  course_name: '',
  academic_year: '',
  year_end: '',
  semester: [],
  status: [],
}

const textFields = [
  { key: 'student_nim', label: 'NIM', placeholder: 'Cari NIM' },
  { key: 'student_name', label: 'Nama Mahasiswa', placeholder: 'Cari nama' },
  { key: 'course_code', label: 'Kode MK', placeholder: 'Cari kode MK' },
  { key: 'course_name', label: 'Nama MK', placeholder: 'Cari nama MK' },
]

const sortColumns = [
  { value: 'student_nim', label: 'NIM' },
  { value: 'student_name', label: 'Nama Mahasiswa' },
  { value: 'course_code', label: 'Kode MK' },
  { value: 'course_name', label: 'Nama MK' },
  { value: 'semester', label: 'Semester' },
  { value: 'academic_year', label: 'Tahun Ajaran' },
  { value: 'status', label: 'Status' },
]

function AdvancedQuery({ onApply }) {
  const [fields, setFields] = useState(emptyFields)
  const [logic, setLogic] = useState('and')
  const [textModes, setTextModes] = useState({})
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')

  function changeField(name, value) {
    setFields((current) => ({ ...current, [name]: value }))
  }

  function toggleChoice(name, value) {
    setFields((current) => ({
      ...current,
      [name]: current[name].includes(value)
        ? current[name].filter((item) => item !== value)
        : [...current[name], value],
    }))
  }

  function updateOrder(index, changes) {
    setOrders((current) =>
      current.map((order, i) =>
        i === index ? { ...order, ...changes } : order,
      ),
    )
  }

  function apply(event) {
    event.preventDefault()
    setError('')

    if (fields.year_end && !fields.academic_year) {
      setError('Isi tahun ajaran awal sebelum mengisi tahun akhir.')
      return
    }

    if (
      fields.academic_year &&
      fields.year_end &&
      fields.academic_year > fields.year_end
    ) {
      setError('Tahun akhir harus sama atau lebih baru dari tahun awal.')
      return
    }

    const filters = []

    textFields.forEach(({ key }) => {
      const value = fields[key].trim()

      if (value) {
        filters.push({
          column: key,
          operator: textModes[key] ?? 'contains',
          value,
        })
      }
    })

    if (fields.academic_year) {
      filters.push({
        column: 'academic_year',
        operator: fields.year_end ? 'between' : 'equals',
        value: fields.year_end
          ? `${fields.academic_year},${fields.year_end}`
          : fields.academic_year,
      })
    }

    if (fields.semester.length > 0) {
      filters.push({
        column: 'semester',
        operator: 'in',
        value: fields.semester.join(','),
      })
    }

    if (fields.status.length > 0) {
      filters.push({
        column: 'status',
        operator: 'in',
        value: fields.status.join(','),
      })
    }

    onApply({ filters, logic, orders })
  }

  function reset() {
    setFields(emptyFields)
    setLogic('and')
    setTextModes({})
    setOrders([])
    setError('')
    onApply({ filters: [], logic: 'and', orders: [] })
  }

  return (
    <details className="advanced-panel">
      <summary>Saring & Urutkan Data</summary>

      <form onSubmit={apply}>
        <p>Isi hanya kolom yang ingin kamu gunakan.</p>

        <div className="filter-grid">
          {textFields.map((field) => (
            <label className="filter-field" key={field.key}>
              {field.label}
              <input
                value={fields[field.key]}
                onChange={(event) =>
                  changeField(field.key, event.target.value)
                }
                placeholder={field.placeholder}
                maxLength={100}
              />
            </label>
          ))}

          <label className="filter-field">
            Tahun Ajaran
            <input
              value={fields.academic_year}
              onChange={(event) =>
                changeField('academic_year', event.target.value)
              }
              placeholder="Contoh: 2025/2026"
              pattern="[0-9]{4}/[0-9]{4}"
            />
          </label>

          <label className="filter-field">
            Sampai Tahun Ajaran (opsional)
            <input
              value={fields.year_end}
              onChange={(event) =>
                changeField('year_end', event.target.value)
              }
              placeholder="Isi jika mencari rentang"
              pattern="[0-9]{4}/[0-9]{4}"
            />
          </label>
        </div>

        <div className="filter-groups">
          <fieldset>
            <legend>Semester</legend>
            {[
              ['GANJIL', 'Ganjil'],
              ['GENAP', 'Genap'],
            ].map(([value, label]) => (
              <label key={value}>
                <input
                  type="checkbox"
                  checked={fields.semester.includes(value)}
                  onChange={() => toggleChoice('semester', value)}
                />
                {label}
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>Status</legend>
            {[
              ['DRAFT', 'Draft'],
              ['SUBMITTED', 'Submitted'],
              ['APPROVED', 'Approved'],
              ['REJECTED', 'Rejected'],
            ].map(([value, label]) => (
              <label key={value}>
                <input
                  type="checkbox"
                  checked={fields.status.includes(value)}
                  onChange={() => toggleChoice('status', value)}
                />
                {label}
              </label>
            ))}
          </fieldset>
        </div>

        <label className="advanced-logic">
          Jika beberapa kolom diisi
          <select
            value={logic}
            onChange={(event) => setLogic(event.target.value)}
          >
            <option value="and">Data harus cocok dengan semuanya</option>
            <option value="or">Data cukup cocok dengan salah satunya</option>
          </select>
        </label>

        <details className="text-options">
          <summary>Opsi pencarian teks (opsional)</summary>
          <p>Secara bawaan, sistem mencari teks yang muncul di mana saja.</p>

          <div className="filter-grid">
            {textFields.map((field) => (
              <label className="filter-field" key={field.key}>
                {field.label}
                <select
                  value={textModes[field.key] ?? 'contains'}
                  onChange={(event) =>
                    setTextModes((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                >
                  <option value="contains">Teks boleh di mana saja</option>
                  <option value="starts_with">Teks di awal</option>
                  <option value="equals">Cocok persis</option>
                </select>
              </label>
            ))}
          </div>
        </details>

        <h3>Urutkan hasil</h3>
        <p>Jika menambah dua urutan, urutan pertama menjadi prioritas.</p>

        {orders.map((order, index) => (
          <div className="advanced-row" key={index}>
            <span>Prioritas {index + 1}</span>

            <select
              aria-label={`Kolom urutan ${index + 1}`}
              value={order.column}
              onChange={(event) =>
                updateOrder(index, { column: event.target.value })
              }
            >
              {sortColumns.map((column) => (
                <option key={column.value} value={column.value}>
                  {column.label}
                </option>
              ))}
            </select>

            <select
              aria-label={`Arah urutan ${index + 1}`}
              value={order.direction}
              onChange={(event) =>
                updateOrder(index, { direction: event.target.value })
              }
            >
              <option value="asc">
                {order.column === 'academic_year'
                  ? 'Terlama dulu'
                  : 'A–Z / angka kecil dulu'}
              </option>
              <option value="desc">
                {order.column === 'academic_year'
                  ? 'Terbaru dulu'
                  : 'Z–A / angka besar dulu'}
              </option>
            </select>

            <button
              type="button"
              onClick={() =>
                setOrders((current) =>
                  current.filter((_, i) => i !== index),
                )
              }
            >
              Hapus
            </button>
          </div>
        ))}

        <button
          type="button"
          disabled={orders.length >= 7}
          onClick={() =>
            setOrders((current) => [
              ...current,
              { column: 'academic_year', direction: 'desc' },
            ])
          }
        >
          + Tambah Urutan
        </button>

        {error && <p role="alert" style={{ color: 'crimson' }}>{error}</p>}

        <div className="advanced-actions">
          <button type="submit">Terapkan Filter</button>
          <button type="button" onClick={reset}>Kosongkan</button>
        </div>
      </form>
    </details>
  )
}

export default AdvancedQuery