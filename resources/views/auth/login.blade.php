<x-guest-layout>
    <section class="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {{-- Left panel: large screens only --}}
        <div class="relative hidden lg:flex items-center bg-blue-200 bg-cover bg-center"
            style="background-image: url('{{ asset('images/login-side.jpg') }}')">
            <div class="absolute inset-0 bg-black/30"></div>
            <div class="relative p-10 text-white">
                <h1 class="text-xl font-semibold">Access your modules, track your progress, complete lessons, and build the skills you need—all in one place.</h1>
                {{-- <p class="mt-2 text-white/80">Access your courses, track your progress, complete lessons, and build the skills you need—all in one place.</p> --}}
            </div>
        </div>

        {{-- Right panel: login --}}
        <div class="flex items-center justify-center bg-gray-100 p-4">
            <div class="w-full max-w-md rounded-lg bg-white p-8 text-black shadow-lg">
                <h2 class="mb-6 text-center text-2xl font-bold text-gray-800">Welcome Back</h2>
                {{-- <h3 class="mb-6 text-center text-md text-gray-800">Sign in to your account to continue.</h3> --}}

                <form action="{{ route('login.post') }}" method="POST" id="loginForm" x-data="{ show: false, loading: false }"
                    @submit="loading = true">
                    @csrf

                    <x-form.input name="email" label="Username" required autofocus autocomplete="email" placeholder="SLBA000" />

                    <div class="mb-6">
                        <label for="password" class="mb-1 block text-sm text-gray-700">Password</label>
                        <div class="relative">
                            <input id="password" name="password" required autocomplete="current-password"
                                :type="show ? 'text' : 'password'" placeholder="Enter your password"
                                class="w-full rounded-lg border border-gray-300 px-4 py-2 pr-16 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <button type="button" @click="show = !show"
                                class="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                                :aria-label="show ? 'Hide password' : 'Show password'">

                                <!-- Eye open -->
                                <svg x-show="!show" xmlns="http://www.w3.org/2000/svg" fill="none"
                                    viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 5 12 5c4.64 0 8.577 2.51 9.964 6.683.07.207.07.429 0 .639C20.577 16.49 16.64 19 12 19c-4.64 0-8.577-2.51-9.964-6.678z" />
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>

                                <!-- Eye slash -->
                                <svg x-show="show" x-cloak xmlns="http://www.w3.org/2000/svg" fill="none"
                                    viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19 12 19c1.498 0 2.866-.256 4.105-.714M6.228 6.228A10.45 10.45 0 0112 5c4.756 0 8.773 2.662 10.065 7a10.523 10.523 0 01-4.132 5.411M6.228 6.228L3 3m3.228 3.228l3.65 3.65m5.894 5.894L21 21m-5.228-5.228l-3.65-3.65m0 0a3 3 0 114.243-4.243" />
                                </svg>

                            </button>

                        </div>
                        @error('password')
                            <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
                        @enderror
                    </div>

                    <div class="mb-6 flex items-center gap-2">
                        <input type="checkbox" id="remember" name="remember"
                            class="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500">
                        <label for="remember" class="text-sm text-gray-600">Remember me</label>
                    </div>

                <x-form.button ::disabled="loading">Sign in</x-form.button>

                </form>
                {{-- 
                <p class="mt-6 text-center text-sm text-gray-600 lg:hidden">
                    No account? <a href="{{ route('register') }}" class="text-blue-600 underline">Create one</a>
                </p> --}}
            </div>
        </div>
    </section>
</x-guest-layout>
