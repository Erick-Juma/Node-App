<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('twill_users', function (Blueprint $table) {
            $table->string('username')->nullable()->after('email');
            $table->string('first_name')->nullable()->after('name');
            $table->string('last_name')->nullable()->after('first_name');
            $table->string('phone_number')->nullable();
            $table->timestamp('email_verified_at')->nullable(); // drop if it already exists
            $table->boolean('is_admin')->default(false);
            $table->boolean('is_company_admin')->default(false);

            $table->unsignedBigInteger('company_id')->nullable();
            $table->string('company_name')->nullable();

            $table->unsignedBigInteger('job_role_id')->nullable();
            $table->string('job_role')->nullable();

            $table->unsignedBigInteger('gender_id')->nullable();
            $table->string('profile_pic')->nullable();
            $table->boolean('initial_profile')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('twill_users', function (Blueprint $table) {
            $table->dropColumn([
                'username',
                'first_name',
                'last_name',
                'phone_number',
                'email_verified_at',
                'is_admin',
                'is_company_admin',
                'company_id',
                'company_name',
                'job_role_id',
                'job_role',
                'gender_id',
                'profile_pic',
                'initial_profile',
            ]);
        });
    }
};
