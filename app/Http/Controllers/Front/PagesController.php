<?php

namespace App\Http\Controllers\Front;

use App\Http\Controllers\Controller;

class PagesController extends Controller
{
    //
    public function courses()
    {
        $key = 'courses';

        return view('site.pages.'.$key);
    }
}
