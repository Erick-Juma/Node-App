@props([
    'title',
    'show' => false,
    'type' => 'info', // info | warning | danger
])

@php
    $styles = [
        'info'    => ['bg' => 'bg-blue-100',  'text' => 'text-blue-600',  'btn' => 'bg-blue-600 hover:bg-blue-700'],
        'warning' => ['bg' => 'bg-amber-100', 'text' => 'text-amber-600', 'btn' => 'bg-amber-600 hover:bg-amber-700'],
        'danger'  => ['bg' => 'bg-red-100',   'text' => 'text-red-600',   'btn' => 'bg-red-600 hover:bg-red-700'],
    ][$type] ?? null;
    $styles ??= [
        'bg' => 'bg-blue-100', 'text' => 'text-blue-600', 'btn' => 'bg-blue-600 hover:bg-blue-700',
    ];
@endphp

<div x-data="{ open: @js($show) }"
     x-show="open" x-cloak
     x-transition:leave="duration-200"
     @keydown.escape.window="open = false"
     class="fixed inset-0 z-50 flex items-center justify-center p-4"
     role="dialog" aria-modal="true" aria-labelledby="modal-title">

    {{-- Backdrop --}}
    <div class="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
         x-show="open"
         x-transition:enter="transition ease-out duration-200"
         x-transition:enter-start="opacity-0"
         x-transition:enter-end="opacity-100"
         x-transition:leave="transition ease-in duration-200"
         x-transition:leave-start="opacity-100"
         x-transition:leave-end="opacity-0"
         @click="open = false"></div>

    {{-- Panel --}}
    <div class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5"
         x-show="open"
         x-transition:enter="transition ease-out duration-200"
         x-transition:enter-start="opacity-0 translate-y-4 scale-95"
         x-transition:enter-end="opacity-100 translate-y-0 scale-100"
         x-transition:leave="transition ease-in duration-200"
         x-transition:leave-start="opacity-100 translate-y-0 scale-100"
         x-transition:leave-end="opacity-0 translate-y-4 scale-95">

        <div class="flex flex-col items-center text-center">
            {{-- Icon --}}
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full {{ $styles['bg'] }} {{ $styles['text'] }}">
                @if ($type === 'info')
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                @else
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                @endif
            </div>

            <h3 id="modal-title" class="text-lg font-semibold text-gray-900">{{ $title }}</h3>
            <div class="mt-2 text-sm leading-relaxed text-gray-500">{{ $slot }}</div>
        </div>

        <div class="mt-6">
            <button type="button" @click="open = false"
                    class="rounded-lg px-4 py-2.5 text-sm font-medium text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 {{ $styles['btn'] }}">
                Dismisss
            </button>
        </div>
    </div>
</div>