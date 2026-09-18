USE dorm_delivery;

ALTER TABLE Users
  ADD COLUMN profile_image MEDIUMTEXT NULL AFTER push_token;
