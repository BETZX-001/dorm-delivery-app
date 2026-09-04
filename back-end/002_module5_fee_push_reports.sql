-- =========================================================
-- Migration: Module 5 fixes
-- Run this only if your database was created BEFORE Module 5
-- (i.e. Slots has no `fee` column yet). If you're running
-- schema.sql fresh, skip this file — it's already included there.
-- =========================================================

USE dorm_delivery;

ALTER TABLE Slots
  ADD COLUMN fee DECIMAL(8,2) NOT NULL DEFAULT 0.00 AFTER current_orders;

ALTER TABLE Users
  ADD COLUMN push_token VARCHAR(255) NULL AFTER avg_rating;

CREATE TABLE IF NOT EXISTS Reports (
  report_id     INT AUTO_INCREMENT PRIMARY KEY,
  reporter_id   CHAR(36)      NOT NULL,
  order_id      INT           NULL,
  category      ENUM('LATE_DELIVERY', 'ITEM_ISSUE', 'PAYMENT_DISPUTE', 'BEHAVIOR', 'OTHER')
                NOT NULL DEFAULT 'OTHER',
  description   VARCHAR(1000) NOT NULL,
  status        ENUM('OPEN', 'REVIEWING', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_reports_reporter
    FOREIGN KEY (reporter_id) REFERENCES Users(user_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_reports_order
    FOREIGN KEY (order_id) REFERENCES Orders(order_id)
    ON DELETE SET NULL,

  INDEX idx_reports_status (status)
) ENGINE=InnoDB;
