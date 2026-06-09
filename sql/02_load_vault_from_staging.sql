SET NOCOUNT ON;

INSERT INTO RV.h_unit (unit_hk, unit_join_key, load_dts, record_source)
SELECT DISTINCT
    HASHBYTES('SHA2_256', LOWER(CONCAT('UNIT|', unit_join_key))) AS unit_hk,
    unit_join_key,
    SYSUTCDATETIME(),
    record_source
FROM STG.masc_survey_participation s
WHERE unit_join_key IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM RV.h_unit h
      WHERE h.unit_hk = HASHBYTES('SHA2_256', LOWER(CONCAT('UNIT|', s.unit_join_key)))
  );

INSERT INTO RV.h_period (period_hk, period, load_dts, record_source)
SELECT DISTINCT
    HASHBYTES('SHA2_256', LOWER(CONCAT('PERIOD|', period))) AS period_hk,
    period,
    SYSUTCDATETIME(),
    record_source
FROM STG.masc_survey_participation s
WHERE period IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM RV.h_period h
      WHERE h.period_hk = HASHBYTES('SHA2_256', LOWER(CONCAT('PERIOD|', s.period)))
  );

INSERT INTO RV.l_unit_period (unit_period_hk, unit_hk, period_hk, load_dts, record_source)
SELECT DISTINCT
    HASHBYTES('SHA2_256', LOWER(CONCAT('UNIT_PERIOD|', unit_join_key, '|', period))) AS unit_period_hk,
    HASHBYTES('SHA2_256', LOWER(CONCAT('UNIT|', unit_join_key))) AS unit_hk,
    HASHBYTES('SHA2_256', LOWER(CONCAT('PERIOD|', period))) AS period_hk,
    SYSUTCDATETIME(),
    record_source
FROM STG.masc_survey_participation s
WHERE unit_join_key IS NOT NULL
  AND period IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM RV.l_unit_period l
      WHERE l.unit_period_hk = HASHBYTES('SHA2_256', LOWER(CONCAT('UNIT_PERIOD|', s.unit_join_key, '|', s.period)))
  );

INSERT INTO RV.s_unit_profile (
    unit_hk,
    load_dts,
    record_source,
    hash_diff,
    unit_name,
    coordinating_council,
    stake_or_district,
    state,
    city,
    unit_zip_code,
    city_latitude,
    city_longitude
)
SELECT DISTINCT
    HASHBYTES('SHA2_256', LOWER(CONCAT('UNIT|', unit_join_key))) AS unit_hk,
    SYSUTCDATETIME(),
    record_source,
    HASHBYTES('SHA2_256', CONCAT_WS('|', unit_name, coordinating_council, stake_or_district, state, city, unit_zip_code, city_latitude, city_longitude)),
    unit_name,
    coordinating_council,
    stake_or_district,
    state,
    city,
    unit_zip_code,
    city_latitude,
    city_longitude
FROM STG.masc_survey_participation
WHERE unit_join_key IS NOT NULL;

INSERT INTO RV.s_unit_period_metrics (
    unit_period_hk,
    load_dts,
    record_source,
    hash_diff,
    source_grain,
    age_group,
    members,
    participating,
    males,
    females,
    not_participating,
    participating_males,
    participating_females,
    source_participation_rate,
    low_participation_flag,
    unit_priority_index,
    city_priority_index,
    isolation_vs_performance,
    stake_distance_tier,
    council_distance_tier,
    miles_to_council_centroid
)
SELECT
    HASHBYTES('SHA2_256', LOWER(CONCAT('UNIT_PERIOD|', unit_join_key, '|', period))) AS unit_period_hk,
    SYSUTCDATETIME(),
    record_source,
    source_hash_diff,
    source_grain,
    age_group,
    members,
    participating,
    males,
    females,
    not_participating,
    participating_males,
    participating_females,
    source_participation_rate,
    low_participation_flag,
    unit_priority_index,
    city_priority_index,
    isolation_vs_performance,
    stake_distance_tier,
    council_distance_tier,
    miles_to_council_centroid
FROM STG.masc_survey_participation
WHERE unit_join_key IS NOT NULL
  AND period IS NOT NULL
  AND (source_grain <> 'age_group' OR age_group <> '0-17');
