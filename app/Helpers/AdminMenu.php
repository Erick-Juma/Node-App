<?php

if (! function_exists('adminMenu')) {
    function adminMenu()
    {
        return [
            'content' => [
                'title' => 'Content',
                'route' => 'twill.companies.index',
                'primary_navigation' => [
                    'companies' => [
                        'title' => 'Companies',
                        'module' => true,
                    ],

                ],
            ],

        ];
    }
}

if (! function_exists('companyHRMenu')) {
    function companyHRMenu()
    {
        return [
            'content' => [
                'title' => 'Content',
                'route' => 'twill.companies.index',
                'primary_navigation' => [
                    'companies' => [
                        'title' => 'Companies',
                        'module' => true,
                    ],

                ],
            ],

        ];
    }
}

if (! function_exists('adminMenuHelper')) {
    function adminMenuHelper()
    {
        if (auth()->guard('twill_users')->check()) {
            $user = auth()->guard('twill_users')->user();

            if ($user->role_value === 'SUPERADMIN' || $user->is_superadmin === 1 || $user->role_id === 1) {
                return adminMenu();
            }
            if ($user->role_value === 'Company HR' || $user->is_company_admin === 1) {
                return companyHRMenu();
            }

            return [];
        }

        return [];
    }
}
