-- =========================================================
-- Migration: selectable start time for delivery slots
-- Run once for databases created before this migration.
-- =========================================================

USE dorm_delivery;

ALTER TABLE Slots
  ADD COLUMN start_time DATETIME NULL AFTER dorm_name;

UPDATE Slots
SET start_time = DATE_SUB(cut_off_time, INTERVAL 2 HOUR)
WHERE start_time IS NULL;

ALTER TABLE Slots
  MODIFY COLUMN start_time DATETIME NOT NULL;
