------------------------------------------------------------
-- UP
------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `ig_track_accounts` (
    `id` integer NOT NULL PRIMARY KEY AUTOINCREMENT,
    `username` varchar(255) NOT NULL,
    `status` tinyint(1) NOT NULL DEFAULT '0',
    `is_new` tinyint(1) NOT NULL DEFAULT '0',
    `created_at` TIMESTAMPS NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMPS NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `tracking_end_date` TIMESTAMPS NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER ac_updating_time_updated_at
AFTER UPDATE ON ig_track_accounts
FOR EACH ROW
BEGIN
  UPDATE ig_track_accounts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;


CREATE TABLE IF NOT EXISTS `ig_account_medias` (
    `id` integer NOT NULL PRIMARY KEY AUTOINCREMENT,
    `account_id` int(11) NOT NULL,
    `ig_shortcode` varchar(100) NOT NULL,
    `url` varchar(255) NOT NULL,
    `caption` varchar(255) NULL,
    `thumbnail_url` varchar(255) NULL,
    `is_video` tinyint(1) NOT NULL DEFAULT '0',
    `is_new` tinyint(1) NOT NULL DEFAULT '0',
    `created_at` TIMESTAMPS NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMPS NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES ig_track_accounts(id) ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE TRIGGER media_updating_time_updated_at
AFTER UPDATE ON ig_account_medias
FOR EACH ROW
BEGIN
  UPDATE ig_account_medias SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
-----------------------------------------------------------
-- DOWN
-----------------------------------------------------------

DROP TABLE IF EXISTS `ig_track_accounts`;
DROP TABLE IF EXISTS `ig_account_medias`;