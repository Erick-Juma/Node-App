{{-- resources/views/components/form/button.blade.php --}}
@props(['type' => 'submit'])

<button type="{{ $type }}"
    {{ $attributes->merge([
        'class' => 'w-full rounded-lg bg-blue-500 py-2 text-white transition-all hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60',
    ]) }}>
    {{ $slot }}
</button>