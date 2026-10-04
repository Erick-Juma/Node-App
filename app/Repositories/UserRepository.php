<?php

namespace App\Repositories;

use A17\Twill\Facades\TwillPermissions;
use A17\Twill\Models\Behaviors\Sortable;
use A17\Twill\Models\Contracts\TwillModelContract;
use A17\Twill\Repositories\UserRepository as TwillUserRepository;
use App\Edx\EdxAuthUser;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Auth\Passwords\PasswordBrokerManager;
use Illuminate\Config\Repository as Config;
use Illuminate\Contracts\Auth\Factory as AuthFactory;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\DatabaseManager;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB as FacadeDB;
use Illuminate\Support\Facades\Hash;
use TaylorNetwork\UsernameGenerator\Generator;
use Throwable;

class UserRepository extends TwillUserRepository
{
    protected array $multiSelectColumns = [
        'company_id' => 'company_id',
        'gender_id' => 'gender_id',
        'job_role_id' => 'job_role_id',
        'department_id' => 'department_id',
        'branch_id' => 'branch_id',
    ];

    public function __construct(
        DatabaseManager $db,
        Config $config,
        PasswordBrokerManager $passwordBrokerManager,
        AuthFactory $authFactory
    ) {
        $this->model = new User;
        $this->passwordBrokerManager = $passwordBrokerManager;
        $this->authFactory = $authFactory;
        $this->config = $config;
        $this->db = $db;
    }

    public function get(
        array $with = [],
        array $scopes = [],
        array $orders = [],
        int $perPage = 20,
        bool $forcePagination = false,
        array $appliedFilters = []
    ): LengthAwarePaginator|Collection {
        $query = $this->model->with($with);

        $query = $this->filter($query, $scopes);
        $query = $this->order($query, $orders);

        $user = Auth::user();
        $isCompanyHR = $user->role_id === 3 || $user->is_company_admin === 1 || $user->role_value === 'Company HR';

        if ($isCompanyHR) {
            $query->where('company_id', Auth::user()->company_id);
        }

        foreach ($appliedFilters as $filter) {
            $query = $filter->applyFilter($query);
        }

        if (! $forcePagination && $this->model instanceof Sortable) {
            return $query->ordered()->get();
        }

        if ($perPage == -1) {
            return $query->get();
        }

        return $query->paginate($perPage);
    }

    public function prepareFieldsBeforeSave(TwillModelContract|User $user, array $fields): array
    {
        /** @var User $editor */
        $editor = $this->authFactory->guard('twill_users')->user();
        $with2faSettings = $this->config->get('twill.enabled.users-2fa', false) && $editor?->id === $user->id;

        if (
            $with2faSettings
            && $user->google_2fa_enabled
            && ! ($fields['google_2fa_enabled'] ?? false)
        ) {
            $fields['google_2fa_secret'] = null;
        }

        if (
            $this->config->get('twill.enabled.users-2fa', false)
            && ($fields['force-2fa-disable-challenge'] ?? false)
        ) {
            $user->google_2fa_enabled = false;
            $user->google_2fa_secret = null;
        }

        return parent::prepareFieldsBeforeSave($user, $fields);
    }

    public function update(int|string $id, array $fields): TwillModelContract
    {
        return $this->db->transaction(function () use ($id, $fields) {

            $object = $this->model->findOrFail($id);

            $originalFields = $fields;

            $this->beforeSave($object, $fields);

            $fields = $this->prepareFieldsBeforeSave($object, $fields);

            if (isset($fields['role_id'])) {
                if ($fields['role_id'] === '1' || $fields['role_id'] === 1 || $fields['role_id'] === '2' || $fields['role_id'] === 2) {
                    $object->is_admin = 1;
                    $object->is_company_admin = 0;
                } elseif ($fields['role_id'] === '3' || $fields['role_id'] === 3) {
                    $object->is_admin = 0;
                    $object->is_company_admin = 1;
                } elseif ($fields['role_id'] === '4' || $fields['role_id'] === 4) {
                    $object->is_admin = 0;
                    $object->is_company_admin = 0;
                }

                $object->role_id = $fields['role_id'];
            }

            $object->fill(Arr::except($fields, $this->getReservedFields()));
            $object->save();

            $this->afterSaveOriginalData($object, $originalFields);
            $this->afterSave($object, $fields);

            return $object->fresh();
        }, 3);
    }

    public function afterSave(TwillModelContract|User $user, array $fields): void
    {
        if (! empty($fields['new_password'])) {
            $user->password = Hash::make($fields['new_password']);
            $user->registered_at ??= Carbon::now();
            $user->require_new_password = ! empty($fields['require_password_change']);
            $user->save();
        }

        if (TwillPermissions::enabled() && auth('twill_users')->user()->can('edit-user-groups')) {
            $this->updateBrowser($user, $fields, 'groups');
        }

        parent::afterSave($user, $fields);
    }

    public function getCountByStatusSlug(string $slug, array $scope = []): int
    {
        $query = $this->model->where($scope);

        if (
            TwillPermissions::enabled() &&
            (
                TwillPermissions::getPermissionModule(getModuleNameByModel($this->model)) ||
                method_exists($this->model, 'scopeAccessible')
            )
        ) {
            $query = $query->accessible();
        }

        $user = Auth::user();
        $isCompanyHR = $user->role_id === 3 || $user->is_company_admin === 1 || $user->role_value === 'Company HR';

        if ($isCompanyHR) {
            $query->where('company_id', Auth::user()->company_id);
        }

        $this->applyRequestMultiSelectFilters($query);

        switch ($slug) {
            case 'all':
                return $query->count();
            case 'activated':
                return $query->published()->count();
            case 'draft':
                return $query->draft()->count();
            case 'trash':
                return $query->onlyTrashed()->count();
        }

        foreach ($this->traitsMethods(__FUNCTION__) as $method) {
            if (($count = $this->$method($slug, $scope)) !== false) {
                return $count;
            }
        }

        return 0;
    }

    protected function applyRequestMultiSelectFilters(Builder $query): void
    {
        $raw = request()->query('filter');
        if (empty($raw)) {
            return;
        }

        try {
            $filter = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            return;
        }

        foreach ($this->multiSelectColumns as $filterKey => $column) {
            $value = $filter[$filterKey] ?? null;

            if (empty($value) || $value === 'all') {
                continue;
            }

            $values = array_filter(
                array_map('strval', (array) $value),
                fn ($v) => $v !== '' && $v !== 'all'
            );

            if (! empty($values)) {
                $query->whereIn($column, $values);
            }
        }
    }

    public function createForRegisterUserCode($fields, $company)
    {
        return FacadeDB::transaction(function () use ($fields, $company) {
            $generator = new Generator(['separator' => '_']);
            $username = $generator->generate($fields['given_name'].' '.$fields['family_name']);

            if (App::environment(['production'])) {
                $usern = EdxAuthUser::where('username', $username)->first();
                if (! empty($usern)) {
                    $username .= '_'.rand(0, 100);
                }
            }

            $object = new User;
            $object->name = $fields['given_name'].' '.$fields['family_name'];
            $object->email = $fields['email'];
            $object->role_id = 4;
            $object->username = $username;
            $object->google_id = $fields['id'];
            $object->company_id = $company;
            $object->registered_at = Carbon::now();
            $object->first_name = $fields['given_name'];
            $object->last_name = $fields['family_name'];
            $object->published = 1;
            $object->save();

            return $object;
        }, 3);
    }
}
