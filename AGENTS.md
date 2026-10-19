# Alhambra film continuation guide

Read README.md, project.json, CREDITS.md and research/finalization.json before changing this project.

- The user approved the cinematic render and a public project backup.
- The final cut is 1920×1080 at 32fps, 8,621 video frames, approximately 4:29 including credits.
- Keep the original narration unchanged unless the user requests an edit.
- src/cinematic/ is the current engine. preview/ and src/film.js preserve the earlier approved static study.
- The latest manifest may reuse unchanged checkpoints from an older build; follow each record's actual repository_path and backup_commit rather than inventing new paths.
- Do not delete media, sources or prior checkpoints. Preserve version history in the user's public repository.
- Never put credentials into files or git. No credential is stored in this project. Public media can be retrieved without a token.
- Runtime packages and cache directories may disappear between sessions; the project sources and public GitHub checkpoints are the recovery source of truth.
- The workspace is close to its snapshot budget. Run tools/storage_report.py before adding large files. No out/ directory.
- Further rendering or publishing requires a new user request. The full cut awaits the user's creative feedback, not additional autonomous production.
