<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use A17\Twill\Models\Contracts\TwillModelContract;
use A17\Twill\Models\User as TwillUser;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;

class User extends TwillUser implements TwillModelContract
{
    const GENDER_FEMALE = 1;

    const GENDER_MALE = 2;

    const GENDER_UNDEFINED = 3;

    const PASS_MARK = 70;

    const PASS_SCORE = 0.7;

    const AUTHENTICATION_GOOGLE = 1;

    const AUTHENTICATION_MICROSOFT = 2;

    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public $timestamps = true;

    protected $casts = [
        'is_superadmin' => 'boolean',
        'is_admin' => 'boolean',
        'is_company_admin' => 'boolean',
        'published' => 'boolean',
        'deleted_at' => 'datetime',
        'registered_at' => 'datetime',
        'last_login_at' => 'datetime',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = ['password', 'remember_token', 'google_2fa_secret'];

    public $checkboxes = ['published'];

    public function __construct(array $attributes = [])
    {
        $this->table = config('twill.users_table', 'twill_users');

        parent::__construct($attributes);
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'username',
        'last_login_at',
        'registered_at',
        'require_new_password',
        'is_superadmin',
        'is_admin',
        'is_company_admin',
        'first_name',
        'last_name',
        'published',
        'email_verified_at',
        'company_initials',
        'country_id',
        'company_id',
        'company_name',
        'gender_id',
        'initial_profile',
        'role_id',
        'google_2fa_enabled',
        'google_2fa_secret',
        'completion_status',
        'average_score',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public static function getGender()
    {
        $types = [
            [
                'id' => self::GENDER_FEMALE,
                'title' => 'Female',
            ],
            [
                'id' => self::GENDER_MALE,
                'title' => 'Male',
            ],
            [
                'id' => self::GENDER_UNDEFINED,
                'title' => 'Undefined',
            ],
        ];

        return $types;
    }

    public function getGenderValueAttribute()
    {
        if (! empty($this->gender_id)) {
            if ($this->gender_id == 1) {
                return 'Female';
            } elseif ($this->gender_id == 2) {
                return 'Male';
            } else {
                return 'Undefined';
            }
        } else {
            return null;
        }
    }

    // Relationships go here
    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    // public function completions()
    // {
    //     return $this->hasMany(CompletionReport::class);
    // }
    // public function licenses()
    // {
    //     return $this->hasMany(UserLicense::class);
    // }

    // Attributes go here
    public function setFirstNameAttribute(string $value): void
    {
        $this->attributes['first_name'] = $value;

        if (! empty($this->last_name)) {
            $this->attributes['name'] = "{$value} {$this->last_name}";
        }
    }

    public function setLastNameAttribute(string $value): void
    {
        $this->attributes['last_name'] = $value;

        if (! empty($this->last_name)) {
            $this->attributes['name'] = "{$this->last_name} {$value}";
        }
    }

    public function getNameValueAttribute(): string
    {
        return $this->name ?? (($this->first_name && $this->last_name) ? "{$this->first_name} {$this->last_name}" : '-');
    }

    public function getDateCreatedAttribute()
    {
        return $this->created_at->format('d-m-Y');
    }

    public function getLastLoginAtValueAttribute()
    {
        return $this->last_login_at ? $this->last_login_at->diffForHumans() : '-';
    }

    public function getProfilePicUrlAttribute(): string
    {
        if ($this->profile_pic && Storage::disk('public')->exists($this->profile_pic)) {
            return Storage::disk('public')->url($this->profile_pic);
        }

        return asset('images/defaults/avatar.webp');
    }

    public function getProfilePicAvatarAttribute(): string
    {
        if ($this->profile_pic && Storage::disk('public')->exists($this->profile_pic)) {
            return Storage::disk('public')->url($this->profile_pic);
        }

        return asset('images/defaults/navy-bg-avatar.svg');
    }

    public function getCertifiedAttribute(): bool
    {
        return $this->average_score >= self::PASS_SCORE;
    }

    /**
     * Get certified user IDs efficiently
     */
    public static function getCertifiedUserIds(?int $companyId = null): array
    {
        $query = static::published()->with(['completions']);

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        return $query->get()->filter(fn ($user) => $user->certified)->pluck('id')->toArray();
    }

    /**
     * Scope to get only certified users
     *
     * @param  Builder  $query
     * @return Builder
     */
    public function scopeCertified($query)
    {
        return $query->published()->with(['completions'])->get()->filter(fn ($user) => $user->certified);
    }

    /**
     * Scope to filter by company
     *
     * @param  Builder  $query
     * @param  int  $companyId
     * @return Builder
     */
    public function scopeForCompany($query, $companyId)
    {
        return $query->where('company_id', $companyId);
    }

    public function getIsHrAttribute(): bool
    {
        $user = auth()->guard('twill_users')->user();

        if (! $user || ! $user->role_id) {
            return false;
        }

        return $user->role_id === 3 || $user->is_company_admin === 1 || $user->role_value === 'Company HR';
    }

    public function getHoursAttribute()
    {
        $totalHours = $this->completions->where('completion_status', 'Completed')->map(function ($completion) {
            $effort = $completion->courseRelationship->effort ?? '00:00:00';
            if (! is_string($effort) || empty($effort)) {
                return 0;
            }
            $parts = explode(':', $effort);
            if (count($parts) !== 3 || in_array('', $parts, true)) {
                return 0;
            }

            $days = $parts[0] ?? 0;
            $hours = $parts[1] ?? 0;
            $minutes = $parts[2] ?? 0;

            return ($days * 24) + ($hours * 1) + ($minutes / 60);
        })->sum();

        return number_format((float) $totalHours, 2, '.', '');
    }

    // public function getMandatoryModulesAverageAttribute()
    // {
    //     $this->loadMissing(['completions']);

    //     $mandatoryCourses = Course::published()->pluck('id');

    //     if ($mandatoryCourses->isEmpty()) {
    //         return '-';
    //     }

    //     // Filter only completions matching mandatory courses
    //     $compulsoryCompletions = $this->completions
    //         ->where('score','>=', 0.69)
    //         ->whereIn('id', $mandatoryCourses)
    //         ->sortByDesc('completion_date')
    //         ->unique('id');

    //     if (count($compulsoryCompletions) !== $mandatoryCourses->count()) {
    //         return '-';
    //     }

    //     if ($compulsoryCompletions->isEmpty()) {
    //         return '-';
    //     }

    //     // Compute the average percentage
    //     $average = $compulsoryCompletions->avg(fn($c) => ($c->score / $c->max_score) * 100);

    //     return number_format($average, 2) . '%';
    // }
}
