<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Front\PagesController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::middleware('guest')->group(function () {
    Route::get('/login', [LoginController::class, 'loginForm'])->name('login');
    // middleware('throttle:5, 1')
    Route::post('/login', [LoginController::class, 'login'])->name('login.post');
});

Route::middleware('auth')->group(function () {
    Route::get('/courses', [PagesController::class, 'courses'])->name('courses');
    Route::post('/logout', [LoginController::class, 'logout'])->name('logout')->middleware('auth');
});
