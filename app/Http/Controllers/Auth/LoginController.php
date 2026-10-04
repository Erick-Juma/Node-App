<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\RedirectResponse;
use App\Models\User;

class LoginController extends Controller
{
    //

    public function loginForm(): View
    {
        return view('auth.login');
    }

    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $user = User::withTrashed()->where('email', $credentials['email'])->first();

        if($user){

            if($user->deleted_at){
                return back()->with('account_modal', [
                    'title' => 'Account Archived',
                    'message' => 'This account was archived. Contact your company administrator.',
                ])->onlyInput('email');
            }
        
            if (! $user->published) {
                return back()->with('account_modal', [
                    'title' => 'Account not active',
                    'message' => 'Your account is not active yet. Contact your company administrator.',
                ])->onlyInput('email');
            }
        }

        if (Auth::attempt($credentials, $request->boolean('remember'))) {
            $request->session()->regenerate();

            return redirect()->intended('dashboard');
        }

        return back()->withErrors([
            'email' => 'The provided credentials do not match our records.',
        ])->onlyInput('email');
    }
}
