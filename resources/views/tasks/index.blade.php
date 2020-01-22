@extends('layouts.app')

@section('content')

<h1>タスクツリー</h1>

@if (count($tasks) > 0)
    <span id="js-getTasks" data-task="{{ $tasks }}"></span>
    <div id="menu">
        <ul class="dropdwn" style="display: none;">
            <li>Menu
                <ul class="dropdwn_menu">
                    <li><a id="addTask" href="#">追加</a></li>
                    <li><a id="deleteTask" href="#">削除</a></li>
                    <li><input type="text"><a id="updateTask" href="#" value="">更新</a></li>
                </ul>
            </li>
        </ul>
    </div>
    <svg width="8000" height="6000"> {{-- xmlns="http://www.w3.org/2000/svg"--}}
    </svg>
    
@endif

@endsection