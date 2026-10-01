# Database backups

Set `BACKUP_DIRECTORY` to storage outside the application checkout and set a long, private `BACKUP_ENCRYPTION_KEY`. Run `npm run backup` from the `server` folder. The script exports every MongoDB collection and encrypts each file with AES-256-GCM.

Schedule the command daily in the hosting provider, copy the encrypted files to separate durable storage, and test a restore regularly. Keep the encryption key outside the backup directory. Retention and offsite replication are hosting responsibilities because the application process cannot guarantee durable storage on Render's temporary filesystem.
