<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{ $title ?? config('app.name') }}</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>

<body>
    @if (session('account_modal'))
        <x-modals.account-modal :show="true" :title="session('account_modal.title')">
            {{ session('account_modal.message') }}
        </x-modal>
    @endif
    {{ $slot }}
</body>

</html>
