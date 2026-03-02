PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

DELETE FROM calls;
DELETE FROM sessions;
DELETE FROM signup_invites;
DELETE FROM users;

DELETE FROM sqlite_sequence WHERE name IN (
	'calls',
	'sessions',
	'signup_invites',
	'users'
);

COMMIT;
