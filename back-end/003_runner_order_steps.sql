-- =========================================================
-- Migration: Runner order workflow with tracking steps 1-3
-- Run this once for databases created before this migration.
-- Fresh databases already include WAITING in schema.sql.
-- =========================================================

USE dorm_delivery;

ALTER TABLE Orders
  MODIFY COLUMN order_status
    ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'SHOPPING', 'WAITING', 'DELIVERING', 'COMPLETED')
    NOT NULL DEFAULT 'PENDING';
