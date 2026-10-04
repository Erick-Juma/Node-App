{{-- resources/views/components/form/input.blade.php --}}
@props([
    'name',
    'label' => null,
    'type' => 'text',
])

<div class="mb-6">
    @if ($label)
        <label for="{{ $name }}" class="mb-1 block text-sm text-gray-700">{{ $label }}</label>
    @endif

    <input
        id="{{ $name }}"
        name="{{ $name }}"
        type="{{ $type }}"
        @if ($type !== 'password') value="{{ old($name) }}" @endif
        {{ $attributes->merge([
            'class' => 'w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
        ]) }}
    >

    @error($name)
        <p class="mt-1 text-sm text-red-600">{{ $message }}</p>
    @enderror
</div>