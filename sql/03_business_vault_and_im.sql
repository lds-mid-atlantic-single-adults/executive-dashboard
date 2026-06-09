SET NOCOUNT ON;
GO

CREATE OR ALTER VIEW BV.masc_unit_period_current AS
WITH latest_profile AS (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY unit_hk ORDER BY load_dts DESC) AS rn
    FROM RV.s_unit_profile
),
period_metrics AS (
    SELECT
        l.unit_period_hk,
        l.unit_hk,
        p.period,
        TRY_CONVERT(int, LEFT(p.period, 4)) AS periodYear,
        CASE WHEN p.period LIKE '%Q1%' THEN 1 WHEN p.period LIKE '%Q2%' THEN 2 WHEN p.period LIKE '%Q3%' THEN 3 WHEN p.period LIKE '%Q4%' THEN 4 END AS periodQuarter,
        m.record_source AS sourceObject,
        m.source_grain AS sourceGrain,
        m.age_group AS ageGroup,
        m.members,
        m.participating,
        m.males,
        m.females,
        m.not_participating,
        m.participating_males AS participatingMales,
        m.participating_females AS participatingFemales,
        CASE WHEN NULLIF(m.members, 0) IS NULL THEN NULL ELSE m.participating / NULLIF(m.members, 0) END AS sourceParticipationRate,
        m.low_participation_flag AS lowParticipationFlag,
        m.unit_priority_index AS unitPriorityIndex,
        m.city_priority_index AS cityPriorityIndex,
        m.isolation_vs_performance AS isolationVsPerformance,
        m.stake_distance_tier AS stakeDistanceTier,
        m.council_distance_tier AS councilDistanceTier,
        m.miles_to_council_centroid AS milesToCouncilCentroid
    FROM RV.l_unit_period l
    JOIN RV.h_period p ON p.period_hk = l.period_hk
    JOIN RV.s_unit_period_metrics m ON m.unit_period_hk = l.unit_period_hk
)
SELECT
    pm.period,
    pm.periodYear,
    pm.periodQuarter,
    DENSE_RANK() OVER (ORDER BY pm.periodYear, pm.periodQuarter) AS periodOrder,
    pm.sourceObject,
    pm.sourceGrain,
    pm.ageGroup,
    h.unit_join_key AS unitJoinKey,
    CAST(NULL AS nvarchar(60)) AS unitCode,
    lp.unit_zip_code AS unitZipCode,
    lp.unit_name AS unitName,
    lp.coordinating_council AS coordinatingCouncil,
    lp.stake_or_district AS stakeOrDistrict,
    lp.state,
    lp.city,
    CAST(NULL AS nvarchar(80)) AS snapshotDate,
    pm.members,
    pm.participating,
    pm.males,
    pm.females,
    pm.not_participating AS notParticipating,
    pm.participatingMales,
    pm.participatingFemales,
    pm.sourceParticipationRate,
    pm.lowParticipationFlag,
    pm.unitPriorityIndex,
    pm.cityPriorityIndex,
    pm.isolationVsPerformance,
    pm.stakeDistanceTier,
    pm.councilDistanceTier,
    pm.milesToCouncilCentroid,
    lp.city_latitude AS cityLatitude,
    lp.city_longitude AS cityLongitude
FROM period_metrics pm
JOIN RV.h_unit h ON h.unit_hk = pm.unit_hk
LEFT JOIN latest_profile lp ON lp.unit_hk = pm.unit_hk AND lp.rn = 1
WHERE pm.sourceGrain <> 'age_group' OR pm.ageGroup <> '0-17';
GO

CREATE OR ALTER VIEW IM.masc_dashboard_source_rows AS
SELECT *
FROM BV.masc_unit_period_current;
GO
