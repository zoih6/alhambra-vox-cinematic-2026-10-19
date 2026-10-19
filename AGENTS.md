# Alhambra film continuation guide

Read README.md, project.json, CREDITS.md and research/muwashah-v4-finalization.json first.

- Latest cut: muwashah-v4, 1920×1080, constant 32fps, 9,935 frames / 310.46875 seconds.
- The user authorized replacing the spoken quote at source narration 168.40625–175.96875 with a 45.625-second excerpt of the supplied singing, then resuming the narrator. The original audio files remain unchanged.
- Required end credit: المونتاج والتصميم بواسطة شذى ياسر.
- Current local viewing file: deliverables/alhambra-muwashah-viewing-1080p32.mp4.
- Current edit map and musical engine: src/muwashah-v4/. Edit music-extension.js and rebuild with tools/build_muwashah_engine.py rather than editing its compiled engine.js alone.
- src/cinematic/ and research/render-checkpoints.json preserve the approved previous film. Do not rewrite them unnecessarily.
- research/muwashah-v4-render.json records 33 assembly units. Twenty-four original pieces were reused; use each record's actual repository_path and backup_commit.
- The previous local viewing file was moved, not deleted, to runtime storage after an independently named public archive upload. Its recovery record is research/previous-viewing-archive.json.
- Never delete original assets or rendered history. No out/ directory. Run tools/storage_report.py before adding large files; keep the local snapshot under its budget.
- No credential is stored. Public restoration requires no token; see tools/restore_muwashah_v4.py. Never put a token in a file, prompt, git URL, git config or committed command.
- New edits or publication require a new user request. The revised movie is awaiting the user's creative feedback, not further autonomous production.
