-- PostGIS Migration Script
-- Run this to backfill existing sidewalk_segments with geometry data
-- This converts existing JSONB coordinates to PostGIS geometry columns

-- Backfill existing segments with geometry data
UPDATE sidewalk_segments
SET geometry = ST_GeomFromText(
    'LINESTRING(' || (
        SELECT string_agg((coord->1)::text || ' ' || (coord->0)::text, ',')
        FROM jsonb_array_elements(coordinates) AS coord
    ) || ')',
    4326
)
WHERE geometry IS NULL AND coordinates IS NOT NULL;

-- Verify the migration
SELECT
    COUNT(*) AS total_segments,
    COUNT(geometry) AS segments_with_geometry,
    COUNT(*) - COUNT(geometry) AS missing_geometry
FROM sidewalk_segments;
