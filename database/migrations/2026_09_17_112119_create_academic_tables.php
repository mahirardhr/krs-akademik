<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('nim', 12)->unique();
            $table->string('name', 100);
            $table->string('email', 255)->unique();
            $table->index('name');
        });

        Schema::create('courses', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('code', 7)->unique();
            $table->string('name', 120);
            $table->smallInteger('credits');
            $table->index('name');
        });

        Schema::create('enrollments', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->foreignId('student_id')->constrained('students');
            $table->foreignId('course_id')->constrained('courses');
            $table->string('academic_year', 9);
            $table->string('semester', 6);
            $table->string('status', 9);

            $table->unique(
                ['student_id', 'course_id', 'academic_year', 'semester'],
                'enrollments_unique_krs'
            );

            $table->index('course_id');
            $table->index(
                ['academic_year', 'semester', 'status', 'id'],
                'enrollments_list_index'
            );
        });

        DB::statement(
            'ALTER TABLE courses ADD CONSTRAINT courses_credits_check
             CHECK (credits BETWEEN 1 AND 6)'
        );
        DB::statement(
            "ALTER TABLE enrollments ADD CONSTRAINT enrollments_semester_check
             CHECK (semester IN ('GANJIL', 'GENAP'))"
        );
        DB::statement(
            "ALTER TABLE enrollments ADD CONSTRAINT enrollments_status_check
             CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'))"
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('enrollments');
        Schema::dropIfExists('courses');
        Schema::dropIfExists('students');
    }
};
