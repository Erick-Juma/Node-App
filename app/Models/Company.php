<?php

namespace App\Models;

use A17\Twill\Models\Behaviors\HasBlocks;
use A17\Twill\Models\Behaviors\HasPosition;
use A17\Twill\Models\Behaviors\HasRevisions;
use A17\Twill\Models\Behaviors\Sortable;
use A17\Twill\Models\Model;

class Company extends Model implements Sortable
{
    use HasBlocks, HasPosition, HasRevisions;

    protected $fillable = [
        'published',
        'title',
        'company_initials',
        'staff_population',
        'position',
    ];
}
