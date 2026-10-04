<?php

namespace App\Http\Requests\Twill;

use A17\Twill\Http\Requests\Admin\Request;
use Illuminate\Validation\Rule;

class CompanyRequest extends Request
{
    public function rulesForCreate(): array
    {
        return [
            'title' => ['required', 'unique:companies'],
        ];
    }

    public function rulesForUpdate(): array
    {
        return [
            'company_initials' => [
                'required',
                Rule::unique('companies')->ignore($this->route('company')),
            ],
            'staff_population' => ['required', 'integer'],
        ];
    }
}
