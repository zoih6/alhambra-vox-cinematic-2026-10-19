# Alhambra continuation — layered-v5 is the current delivery

Read README.md, project.json, CREDITS.md and research/v5-finalization.json first.

- Current cut: 1920×1080, constant 32fps, 10,758 frames, 336.1875 seconds.
- Exact supplied-song source interval: 618.670–690.000 seconds (71.330 seconds). Do not revert to the earlier mawwal excerpt. 13.75 ms of silence pads the video grid; no source audio beyond 690.000 is included.
- Song begins at movie 168.40625, narrator resumes at 239.750 from original narration 175.96875. Original source audio files are unchanged.
- Required credit: المونتاج والتصميم بواسطة شذى ياسر. Its words, name parts, marks, underline and source rows have separate reveal clocks.
- Current viewer file: deliverables/alhambra-layered-v5-viewing-1080p32.mp4. Full-quality master is a GitHub Release asset; read research/v5-release-published.json.
- Edit source in src/layered-v5/layer-core.js and layer-scenes.js, then compile with tools/build_layered_v5.py. The older src/cinematic/ and src/muwashah-v4/ remain as historical versions.
- There is no native Adobe After Effects project. Do not claim one. Implemented features are actual Canvas alpha mattes, native-shaped Arabic, component masks, timed path trims, per-layer transforms and perspective depth.
- Never reintroduce one shared position/scale/opacity entrance for a mixed group. Parent controls carry layout only. Do not split connected Arabic letters into separately positioned glyphs.
- New historical person pictures are imagined illustrations and are labeled accordingly; never describe them as authentic portraits. The construction stone and key are illustrative props.
- The current manifest has 34 pieces. Follow each piece's real path and backup_commit; 2 and 3 were corrected separately for a foreground-paper occlusion. All current pieces were verified and backed up.
- Old full-HD PNG exports and an old derived mix were moved to runtime storage only after verified public archival copies. Original user-supplied narration/music and all current inputs remain persistent.
- Run tools/storage_report.py before adding large files. Keep the snapshot below its budget; no out/ folder. Do not delete source assets or previous render history.
- Credentials are not stored. Public restoration uses tools/restore_layered_v5.py without a token. Never commit a token or embed one in URLs or media prompts.
- Further edits, rendering or publication require a new user request. User creative review of the latest cut is still pending.
