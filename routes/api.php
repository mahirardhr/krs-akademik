<?php

use App\Http\Controllers\Api\EnrollmentController;
use Illuminate\Support\Facades\Route;

Route::get('/enrollments', [EnrollmentController::class, 'index']);
Route::post('/enrollments', [EnrollmentController::class, 'store']);
Route::put('/enrollments/{id}', [EnrollmentController::class, 'update']);
Route::delete('/enrollments/{id}', [EnrollmentController::class, 'destroy']);
Route::get('/courses/options', [EnrollmentController::class, 'courseOptions']);
Route::get('/enrollments/export', [EnrollmentController::class, 'export']);