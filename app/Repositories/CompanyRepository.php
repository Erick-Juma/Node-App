<?php

namespace App\Repositories;

use A17\Twill\Repositories\Behaviors\HandleBlocks;
use A17\Twill\Repositories\Behaviors\HandleRevisions;
use A17\Twill\Repositories\ModuleRepository;
use App\Models\Company;

class CompanyRepository extends ModuleRepository
{
    use HandleBlocks, HandleRevisions;

    public function __construct(Company $model)
    {
        $this->model = $model;
    }
}
