<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class EnrollmentController extends Controller
{
    private const COLUMNS = [
        'student_nim' => 's.nim',
        'student_name' => 's.name',
        'course_code' => 'c.code',
        'course_name' => 'c.name',
        'semester' => 'e.semester',
        'academic_year' => 'e.academic_year',
        'status' => 'e.status',
    ];

    private const FORM_MESSAGES = [
        'required' => ':attribute wajib diisi.',
        'required_if' => ':attribute wajib diisi ketika membuat data baru.',
        'regex' => 'Format :attribute tidak valid.',
        'email' => ':attribute harus berupa alamat email yang valid.',
        'unique' => ':attribute sudah digunakan.',
        'string' => ':attribute harus berupa teks.',
        'min.string' => ':attribute minimal :min karakter.',
        'max.string' => ':attribute maksimal :max karakter.',
        'max' => ':attribute maksimal :max karakter.',
        'integer' => ':attribute harus berupa bilangan bulat.',
        'between' => ':attribute harus antara :min dan :max.',
        'in' => ':attribute yang dipilih tidak valid.',
    ];

    private const FORM_ATTRIBUTES = [
        'student.mode' => 'Pilihan mahasiswa',
        'student.nim' => 'NIM',
        'student.name' => 'Nama mahasiswa',
        'student.email' => 'Email mahasiswa',
        'course.mode' => 'Pilihan mata kuliah',
        'course.code' => 'Kode mata kuliah',
        'course.name' => 'Nama mata kuliah',
        'course.credits' => 'SKS',
        'enrollment.academic_year' => 'Tahun ajaran',
        'enrollment.semester' => 'Semester',
        'enrollment.status' => 'Status',
        'academic_year' => 'Tahun ajaran',
        'semester' => 'Semester',
        'status' => 'Status',
    ];

    private function validateListRequest(Request $request): array
    {
        return $request->validate([
            'page' => ['sometimes', 'integer', 'min:1'],
            'page_size' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'sort_by' => ['sometimes', Rule::in(array_keys(self::COLUMNS))],
            'direction' => ['sometimes', Rule::in(['asc', 'desc'])],
            'status' => ['sometimes', Rule::in(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'])],
            'semester' => ['sometimes', Rule::in(['GANJIL', 'GENAP'])],
            'search' => ['sometimes', 'string', 'max:100'],
            'filter_logic' => ['sometimes', Rule::in(['and', 'or'])],
            'filters' => ['sometimes', 'array', 'max:7'],
            'filters.*.column' => ['required', Rule::in(array_keys(self::COLUMNS))],
            'filters.*.operator' => ['required', Rule::in(['contains', 'starts_with', 'equals', 'in', 'between'])],
            'filters.*.value' => ['required', 'string', 'max:150'],
            'orders' => ['sometimes', 'array', 'max:7'],
            'orders.*.column' => ['required', Rule::in(array_keys(self::COLUMNS))],
            'orders.*.direction' => ['required', Rule::in(['asc', 'desc'])],
        ]);
    }

    /** The list and CSV use the same WHERE conditions. */
    private function enrollmentQuery(array $input): Builder
    {
        $query = DB::table('enrollments as e')
            ->join('students as s', 's.id', '=', 'e.student_id')
            ->join('courses as c', 'c.id', '=', 'e.course_id')
            ->select(
                'e.id',
                's.nim as student_nim',
                's.name as student_name',
                'c.code as course_code',
                'c.name as course_name',
                'e.academic_year',
                'e.semester',
                'e.status'
            );

        if (isset($input['status'])) {
            $query->where('e.status', $input['status']);
        }

        if (isset($input['semester'])) {
            $query->where('e.semester', $input['semester']);
        }

        $search = trim($input['search'] ?? '');

        if ($search !== '') {
            $pattern = '%'.$search.'%';

            $query->where(function ($searchQuery) use ($pattern) {
                $searchQuery
                    ->whereIn('e.student_id', function ($studentQuery) use ($pattern) {
                        $studentQuery
                            ->select('id')
                            ->from('students')
                            ->where(function ($studentFilter) use ($pattern) {
                                $studentFilter
                                    ->where('nim', 'ILIKE', $pattern)
                                    ->orWhere('name', 'ILIKE', $pattern);
                            });
                    })
                    ->orWhereIn('e.course_id', function ($courseQuery) use ($pattern) {
                        $courseQuery
                            ->select('id')
                            ->from('courses')
                            ->where('code', 'ILIKE', $pattern);
                    });
            });
        }

        $filters = $input['filters'] ?? [];
        $logic = $input['filter_logic'] ?? 'and';
        if ($filters !== []) {
            $query->where(function ($group) use ($filters, $logic) {
                foreach ($filters as $index => $filter) {
                    $method = $logic === 'or' && $index > 0 ? 'orWhere' : 'where';
                    $group->{$method}(function ($condition) use ($filter) {
                        $column = self::COLUMNS[$filter['column']];
                        $operator = $filter['operator'];
                        $value = trim($filter['value']);

                        if ($operator === 'contains') {
                            $condition->where($column, 'ILIKE', '%'.$value.'%');

                            return;
                        }

                        if ($operator === 'starts_with') {
                            $condition->where($column, 'ILIKE', $value.'%');

                            return;
                        }

                        if ($operator === 'equals') {
                            $condition->where($column, '=', $value);

                            return;
                        }

                        if ($operator === 'in') {
                            if (! in_array($filter['column'], ['semester', 'status'], true)) {
                                throw ValidationException::withMessages([
                                    'filters' => 'Operator IN hanya untuk semester atau status.',
                                ]);
                            }
                            $values = array_values(array_filter(
                                array_map('trim', explode(',', $value)),
                                fn ($item) => $item !== ''
                            ));
                            if ($values === [] || count($values) > 4) {
                                throw ValidationException::withMessages([
                                    'filters' => 'Isi IN dengan 1 sampai 4 nilai, dipisahkan koma.',
                                ]);
                            }
                            $allowed = $filter['column'] === 'status'
                                ? ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']
                                : ['GANJIL', 'GENAP'];
                            if (array_diff($values, $allowed) !== []) {
                                throw ValidationException::withMessages([
                                    'filters' => 'Pilihan status atau semester tidak valid.',
                                ]);
                            }
                            $condition->whereIn($column, $values);

                            return;
                        }

                        if ($filter['column'] !== 'academic_year') {
                            throw ValidationException::withMessages([
                                'filters' => 'Rentang hanya tersedia untuk tahun ajaran.',
                            ]);
                        }
                        $years = array_map('trim', explode(',', $value));
                        if (
                            count($years) !== 2
                            || ! preg_match('/^[0-9]{4}\/[0-9]{4}$/', $years[0])
                            || ! preg_match('/^[0-9]{4}\/[0-9]{4}$/', $years[1])
                            || $years[0] > $years[1]
                        ) {
                            throw ValidationException::withMessages([
                                'filters' => 'Rentang tahun harus seperti 2021/2022,2025/2026.',
                            ]);
                        }
                        $condition->whereBetween($column, $years);
                    });
                }
            });
        }

        return $query;
    }

    public function index(Request $request)
    {
        $input = $this->validateListRequest($request);
        $query = $this->enrollmentQuery($input);

        if (! empty($input['orders'])) {
            foreach ($input['orders'] as $order) {
                $query->orderBy(self::COLUMNS[$order['column']], $order['direction']);
            }
        } elseif (isset($input['sort_by'])) {
            $query->orderBy(self::COLUMNS[$input['sort_by']], $input['direction'] ?? 'asc');
        }

        return $query->orderBy('e.id')
            ->paginate((int) ($input['page_size'] ?? 25))
            ->withQueryString();
    }

    public function export(Request $request)
    {
        $input = $this->validateListRequest($request);
        $query = $this->enrollmentQuery($input);

        return response()->streamDownload(function () use ($query) {
            @set_time_limit(0);
            $out = fopen('php://output', 'wb');
            fwrite($out, "\xEF\xBB\xBF"); // Excel UTF-8 BOM
            fputcsv($out, ['NIM', 'Nama Mahasiswa', 'Kode MK', 'Nama MK', 'Semester', 'Tahun Ajaran', 'Status'], ',', '"', '');

            $query->chunkById(5000, function ($rows) use ($out) {
                foreach ($rows as $row) {
                    // Prevent spreadsheet software from evaluating user text as formulas.
                    $values = [
                        $row->student_nim,
                        $row->student_name,
                        $row->course_code,
                        $row->course_name,
                        $row->semester,
                        $row->academic_year,
                        $row->status,
                    ];
                    $values = array_map(function ($value) {
                        $text = (string) $value;

                        return preg_match('/^[\s]*[=+\-@]/u', $text) ? "'".$text : $text;
                    }, $values);
                    fputcsv($out, $values, ',', '"', '');
                }
                flush();
                if (connection_aborted()) {
                    return false;
                }
            }, 'e.id', 'id');

            fclose($out);
        }, 'krs-'.date('Y-m-d-His').'.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Cache-Control' => 'no-store',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'student.mode' => ['required', Rule::in(['existing', 'new'])],
            'student.nim' => ['required', 'regex:/^[0-9]{8,12}$/'],
            'student.name' => ['required_if:student.mode,new', 'string', 'min:3', 'max:100'],
            'student.email' => ['required_if:student.mode,new', 'email', 'max:255'],

            'course.mode' => ['required', Rule::in(['existing', 'new'])],
            'course.code' => ['required', 'regex:/^[A-Z]{2,4}[0-9]{3}$/'],
            'course.name' => ['required_if:course.mode,new', 'string', 'min:3', 'max:120'],
            'course.credits' => ['required_if:course.mode,new', 'integer', 'between:1,6'],

            'enrollment.academic_year' => ['required', 'regex:/^[0-9]{4}\/[0-9]{4}$/'],
            'enrollment.semester' => ['required', Rule::in(['GANJIL', 'GENAP'])],
            'enrollment.status' => [
                'required',
                Rule::in(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']),
            ],
        ], self::FORM_MESSAGES, self::FORM_ATTRIBUTES);

        // Aturan unik hanya berlaku jika membuat data baru.
        if ($data['student']['mode'] === 'new') {
            $request->validate([
                'student.nim' => ['unique:students,nim'],
                'student.email' => ['unique:students,email'],
            ], self::FORM_MESSAGES, self::FORM_ATTRIBUTES);
        }

        if ($data['course']['mode'] === 'new') {
            $request->validate([
                'course.code' => ['unique:courses,code'],
            ], self::FORM_MESSAGES, self::FORM_ATTRIBUTES);
        }

        $enrollmentId = DB::transaction(function () use ($data) {
            if ($data['student']['mode'] === 'existing') {
                $studentId = DB::table('students')
                    ->where('nim', $data['student']['nim'])
                    ->value('id');

                if ($studentId === null) {
                    throw ValidationException::withMessages([
                        'student.nim' => 'Mahasiswa dengan NIM tersebut tidak ditemukan.',
                    ]);
                }
            } else {
                $studentId = DB::table('students')->insertGetId([
                    'nim' => $data['student']['nim'],
                    'name' => $data['student']['name'],
                    'email' => $data['student']['email'],
                ]);
            }

            if ($data['course']['mode'] === 'existing') {
                $courseId = DB::table('courses')
                    ->where('code', $data['course']['code'])
                    ->value('id');

                if ($courseId === null) {
                    throw ValidationException::withMessages([
                        'course.code' => 'Mata kuliah yang dipilih tidak ditemukan.',
                    ]);
                }
            } else {
                $courseId = DB::table('courses')->insertGetId([
                    'code' => $data['course']['code'],
                    'name' => $data['course']['name'],
                    'credits' => $data['course']['credits'],
                ]);
            }

            $duplicate = DB::table('enrollments')
                ->where('student_id', $studentId)
                ->where('course_id', $courseId)
                ->where('academic_year', $data['enrollment']['academic_year'])
                ->where('semester', $data['enrollment']['semester'])
                ->exists();

            if ($duplicate) {
                throw ValidationException::withMessages([
                    'enrollment' => [
                        'Mahasiswa sudah mengambil mata kuliah ini pada tahun ajaran dan semester yang sama.',
                    ],
                ]);
            }

            return DB::table('enrollments')->insertGetId([
                'student_id' => $studentId,
                'course_id' => $courseId,
                'academic_year' => $data['enrollment']['academic_year'],
                'semester' => $data['enrollment']['semester'],
                'status' => $data['enrollment']['status'],
            ]);
        });

        return response()->json([
            'message' => 'KRS berhasil ditambahkan.',
            'id' => $enrollmentId,
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'academic_year' => ['required', 'regex:/^[0-9]{4}\/[0-9]{4}$/'],
            'semester' => ['required', Rule::in(['GANJIL', 'GENAP'])],
            'status' => [
                'required',
                Rule::in(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']),
            ],
        ], self::FORM_MESSAGES, self::FORM_ATTRIBUTES);

        $enrollment = DB::table('enrollments')->where('id', $id)->first();

        if ($enrollment === null) {
            return response()->json(['message' => 'Data KRS tidak ditemukan.'], 404);
        }

        $duplicate = DB::table('enrollments')
            ->where('student_id', $enrollment->student_id)
            ->where('course_id', $enrollment->course_id)
            ->where('academic_year', $data['academic_year'])
            ->where('semester', $data['semester'])
            ->where('id', '!=', $id)
            ->exists();

        if ($duplicate) {
            throw ValidationException::withMessages([
                'enrollment' => [
                    'Mahasiswa sudah mengambil mata kuliah ini pada tahun ajaran dan semester yang sama.',
                ],
            ]);
        }

        DB::table('enrollments')
            ->where('id', $id)
            ->update($data);

        return response()->json(['message' => 'KRS berhasil diperbarui.']);
    }

    public function destroy(int $id)
    {
        $deleted = DB::table('enrollments')
            ->where('id', $id)
            ->delete();

        if ($deleted === 0) {
            return response()->json([
                'message' => 'Data KRS tidak ditemukan.',
            ], 404);
        }

        return response()->json([
            'message' => 'KRS berhasil dihapus.',
        ]);
    }

    public function courseOptions()
    {
        return response()->json(
            DB::table('courses')
                ->select('code', 'name')
                ->orderBy('code')
                ->limit(500)
                ->get()
        );
    }
}
