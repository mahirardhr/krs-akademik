<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class AcademicSeeder extends Seeder
{
    public function run(): void
    {
        $students = (int) env('KRS_STUDENTS', 100);
        $courses = (int) env('KRS_COURSES', 10);

        if ($students < 1 || $students > 50_000 || $courses < 1 || $courses > 100) {
            throw new InvalidArgumentException(
                'KRS_STUDENTS harus 1–50000 dan KRS_COURSES harus 1–100.'
            );
        }

        DB::statement(
            "
            INSERT INTO students (nim, name, email)
            SELECT
                LPAD(n::text, 8, '0'),
                'Mahasiswa ' || n,
                'mahasiswa' || n || '@example.test'
            FROM generate_series(1, CAST(? AS integer)) AS n
            ",
            [$students]
        );

        DB::statement(
            "
            INSERT INTO courses (code, name, credits)
            SELECT
                'IF' || LPAD(n::text, 3, '0'),
                'Mata Kuliah ' || n,
                (n % 5) + 1
            FROM generate_series(1, CAST(? AS integer)) AS n
            ",
            [$courses]
        );

        // Setiap batch maksimal 500 mahasiswa × 100 MK = 50.000 KRS.
        for ($start = 1; $start <= $students; $start += 500) {
            $end = min($start + 499, $students);

            DB::statement(
                "
                INSERT INTO enrollments
                    (student_id, course_id, academic_year, semester, status)
                SELECT
                    s.id,
                    c.id,
                    (2021 + ((v.course_no - 1) / 20))::text
                        || '/' ||
                    (2022 + ((v.course_no - 1) / 20))::text,
                    CASE
                        WHEN ((v.course_no - 1) % 20) < 10
                        THEN 'GANJIL'
                        ELSE 'GENAP'
                    END,
                    CASE ((s.id + c.id) % 4)
                        WHEN 0 THEN 'DRAFT'
                        WHEN 1 THEN 'SUBMITTED'
                        WHEN 2 THEN 'APPROVED'
                        ELSE 'REJECTED'
                    END
                FROM students AS s
                CROSS JOIN courses AS c
                CROSS JOIN LATERAL (
                    SELECT SUBSTRING(c.code FROM 3)::integer AS course_no
                ) AS v
                WHERE s.nim BETWEEN ? AND ?
                ",
                [
                    str_pad((string) $start, 8, '0', STR_PAD_LEFT),
                    str_pad((string) $end, 8, '0', STR_PAD_LEFT),
                ]
            );

            $this->command?->info("KRS mahasiswa {$start}–{$end} selesai");
        }
    }
}