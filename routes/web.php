<?php

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

// トップページ
Route::get('/', 'TasksController@index');

// ユーザー登録
Route::get('signup', 'Auth\RegisterController@showRegistrationForm')->name('signup.get');
Route::post('signup', 'Auth\RegisterController@register')->name('signup.post');

// ログイン認証
Route::get('login', 'Auth\LoginController@showLoginForm')->name('login');
Route::post('login', 'Auth\LoginController@login')->name('login.post');
Route::get('logout', 'Auth\LoginController@logout')->name('logout.get');


// ログイン認証を要求するページ
Route::group(['middleware' => ['auth']], function () {

    // タスクツリー表示
    Route::get('tasks/tree', 'TasksController@tree')->name('tasks.tree');

    // Laravelによるtaskインスタンスの操作
    Route::resource('tasks', 'TasksController');

    // FrontendのAjaxによるtaskインスタンスの操作
    Route::post('tasks/ajax', 'TasksController@ajaxCRUD');
    Route::get('tasks/ajax', 'TasksController@ajaxIndex');

    // Projectに関するrouting
    Route::resource('projects', 'ProjectsController');

});
