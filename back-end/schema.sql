-- =========================================================
-- Dorm Delivery Matching System - MySQL Schema (DDL)
-- =========================================================

CREATE DATABASE IF NOT EXISTS dorm_delivery
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE dorm_delivery;

-- ---------------------------------------------------------
-- Users
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS Users (
  user_id       CHAR(36)      NOT NULL PRIMARY KEY,       -- Firebase UID
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL UNIQUE,
  phone         VARCHAR(20)   NULL,
  dorm_name     VARCHAR(100)  NOT NULL,
  room_number   VARCHAR(20)   NULL,
  role          ENUM('RUNNER', 'REQUESTER') NOT NULL DEFAULT 'REQUESTER',
  avg_rating    DECIMAL(3,2)  NOT NULL DEFAULT 0.00,
  push_token    VARCHAR(255)  NULL,                       -- Expo push token, set from the client
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_users_dorm_name (dorm_name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Slots
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS Slots (
  slot_id         INT AUTO_INCREMENT PRIMARY KEY,
  runner_id       CHAR(36)      NOT NULL,
  destination     VARCHAR(150)  NOT NULL,
  dorm_name       VARCHAR(100)  NOT NULL,   -- denormalized for fast matching queries
  cut_off_time    DATETIME      NOT NULL,
  max_orders      INT           NOT NULL DEFAULT 1,
  current_orders  INT           NOT NULL DEFAULT 0,
  fee             DECIMAL(8,2)  NOT NULL DEFAULT 0.00,   -- delivery fee, settled outside the app (e.g. PromptPay)
  status          ENUM('OPEN', 'FULL', 'SHOPPING', 'COMPLETED') NOT NULL DEFAULT 'OPEN',
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_slots_runner
    FOREIGN KEY (runner_id) REFERENCES Users(user_id)
    ON DELETE CASCADE,

  CONSTRAINT chk_slots_orders CHECK (current_orders <= max_orders),

  INDEX idx_slots_matching (dorm_name, status, cut_off_time)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Orders
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS Orders (
  order_id      INT AUTO_INCREMENT PRIMARY KEY,
  slot_id       INT           NOT NULL,
  requester_id  CHAR(36)      NOT NULL,
  item_name     VARCHAR(200)  NOT NULL,
  quantity      INT           NOT NULL DEFAULT 1,
  note          VARCHAR(255)  NULL,
  order_status  ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'SHOPPING', 'DELIVERING', 'COMPLETED')
                NOT NULL DEFAULT 'PENDING',
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_orders_slot
    FOREIGN KEY (slot_id) REFERENCES Slots(slot_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_orders_requester
    FOREIGN KEY (requester_id) REFERENCES Users(user_id)
    ON DELETE CASCADE,

  INDEX idx_orders_slot (slot_id),
  INDEX idx_orders_requester (requester_id),
  INDEX idx_orders_status (order_status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS Reviews (
  review_id     INT AUTO_INCREMENT PRIMARY KEY,
  order_id      INT           NOT NULL,
  reviewer_id   CHAR(36)      NOT NULL,
  runner_id     CHAR(36)      NOT NULL,
  rating_score  TINYINT       NOT NULL,
  comment       VARCHAR(500)  NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_reviews_order
    FOREIGN KEY (order_id) REFERENCES Orders(order_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_reviews_reviewer
    FOREIGN KEY (reviewer_id) REFERENCES Users(user_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_reviews_runner
    FOREIGN KEY (runner_id) REFERENCES Users(user_id)
    ON DELETE CASCADE,

  CONSTRAINT chk_reviews_score CHECK (rating_score BETWEEN 1 AND 5),
  CONSTRAINT uq_reviews_order UNIQUE (order_id),

  INDEX idx_reviews_runner (runner_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Reports (issue reporting - new in Module 5)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS Reports (
  report_id     INT AUTO_INCREMENT PRIMARY KEY,
  reporter_id   CHAR(36)      NOT NULL,
  order_id      INT           NULL,                        -- optional: report tied to a specific order
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
