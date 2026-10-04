<?php

namespace App\Providers;

use A17\Twill\Http\Controllers\Admin\UserController as TwillUserController;
use App\Http\Controllers\Twill\UserController as CMSUserController;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(TwillUserController::class, CMSUserController::class);
    }

    public function boot(): void
    {
        View::composer('twill::*', function ($view) {
            if (! config()->has('twill-navigation-set')) {
                config(['twill-navigation' => adminMenuHelper()]);
                config(['twill-navigation-set' => true]);
            }
        });
    }
}
