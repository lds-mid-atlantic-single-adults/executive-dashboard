SET NOCOUNT ON;

IF OBJECT_ID('STG.masc_survey_participation', 'U') IS NULL
CREATE TABLE STG.masc_survey_participation (
    stg_row_id bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
    load_dts datetime2(3) NOT NULL CONSTRAINT DF_STG_masc_load_dts DEFAULT SYSUTCDATETIME(),
    record_source nvarchar(260) NOT NULL,
    source_system nvarchar(100) NOT NULL,
    source_file_path nvarchar(500) NULL,
    source_row_number int NULL,
    source_hash_diff varbinary(32) NOT NULL,
    period nvarchar(20) NULL,
    period_year int NULL,
    period_quarter int NULL,
    source_grain nvarchar(30) NULL,
    age_group nvarchar(40) NULL,
    unit_join_key nvarchar(320) NULL,
    unit_code nvarchar(60) NULL,
    unit_zip_code nvarchar(20) NULL,
    unit_name nvarchar(220) NULL,
    coordinating_council nvarchar(220) NULL,
    stake_or_district nvarchar(220) NULL,
    state nvarchar(80) NULL,
    city nvarchar(160) NULL,
    snapshot_date nvarchar(80) NULL,
    members float NULL,
    participating float NULL,
    males float NULL,
    females float NULL,
    not_participating float NULL,
    participating_males float NULL,
    participating_females float NULL,
    source_participation_rate float NULL,
    low_participation_flag bit NULL,
    unit_priority_index float NULL,
    city_priority_index float NULL,
    isolation_vs_performance nvarchar(120) NULL,
    stake_distance_tier nvarchar(80) NULL,
    council_distance_tier nvarchar(80) NULL,
    miles_to_council_centroid float NULL,
    city_latitude float NULL,
    city_longitude float NULL
);

IF OBJECT_ID('RV.h_unit', 'U') IS NULL
CREATE TABLE RV.h_unit (
    unit_hk varbinary(32) NOT NULL PRIMARY KEY,
    unit_join_key nvarchar(320) NOT NULL,
    load_dts datetime2(3) NOT NULL,
    record_source nvarchar(260) NOT NULL
);

IF OBJECT_ID('RV.h_period', 'U') IS NULL
CREATE TABLE RV.h_period (
    period_hk varbinary(32) NOT NULL PRIMARY KEY,
    period nvarchar(20) NOT NULL,
    load_dts datetime2(3) NOT NULL,
    record_source nvarchar(260) NOT NULL
);

IF OBJECT_ID('RV.l_unit_period', 'U') IS NULL
CREATE TABLE RV.l_unit_period (
    unit_period_hk varbinary(32) NOT NULL PRIMARY KEY,
    unit_hk varbinary(32) NOT NULL,
    period_hk varbinary(32) NOT NULL,
    load_dts datetime2(3) NOT NULL,
    record_source nvarchar(260) NOT NULL
);

IF OBJECT_ID('RV.s_unit_profile', 'U') IS NULL
CREATE TABLE RV.s_unit_profile (
    unit_hk varbinary(32) NOT NULL,
    load_dts datetime2(3) NOT NULL,
    record_source nvarchar(260) NOT NULL,
    hash_diff varbinary(32) NOT NULL,
    unit_name nvarchar(220) NULL,
    coordinating_council nvarchar(220) NULL,
    stake_or_district nvarchar(220) NULL,
    state nvarchar(80) NULL,
    city nvarchar(160) NULL,
    unit_zip_code nvarchar(20) NULL,
    city_latitude float NULL,
    city_longitude float NULL,
    CONSTRAINT PK_s_unit_profile PRIMARY KEY (unit_hk, load_dts, hash_diff)
);

IF OBJECT_ID('RV.s_unit_period_metrics', 'U') IS NULL
CREATE TABLE RV.s_unit_period_metrics (
    unit_period_hk varbinary(32) NOT NULL,
    load_dts datetime2(3) NOT NULL,
    record_source nvarchar(260) NOT NULL,
    hash_diff varbinary(32) NOT NULL,
    source_grain nvarchar(30) NULL,
    age_group nvarchar(40) NULL,
    members float NULL,
    participating float NULL,
    males float NULL,
    females float NULL,
    not_participating float NULL,
    participating_males float NULL,
    participating_females float NULL,
    source_participation_rate float NULL,
    low_participation_flag bit NULL,
    unit_priority_index float NULL,
    city_priority_index float NULL,
    isolation_vs_performance nvarchar(120) NULL,
    stake_distance_tier nvarchar(80) NULL,
    council_distance_tier nvarchar(80) NULL,
    miles_to_council_centroid float NULL,
    CONSTRAINT PK_s_unit_period_metrics PRIMARY KEY (unit_period_hk, load_dts, hash_diff)
);
