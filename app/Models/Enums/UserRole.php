<?php

namespace A17\Twill\Models\Enums;

use MyCLabs\Enum\Enum;

class UserRole extends Enum
{
    public const Learner = 'Learner';

    public const COMPANYHR = 'Company HR';

    public const ADMIN = 'Admin';

    public const SUPERADMIN = 'Superadmin'; // Twill requires this exact name and case
}
