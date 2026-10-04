<?php

use A17\Twill\Enums\PermissionLevel;

return [

    'enabled' => [
        'permissions-management' => true,
    ],
    'permissions' => [
        'level' => PermissionLevel::LEVEL_ROLE,
        'modules' => ['companies'],
    ],
    'users_table' => 'twill_users',
];
