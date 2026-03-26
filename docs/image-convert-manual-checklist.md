# Image Convert Manual Check

This checklist covers the browser-side end-to-end verification path for the image converter.

## Mixed-Success Batch

1. Open the image converter tab in a local production build.
2. Add a batch that contains valid HEIC files plus several intentionally broken HEIC files.
3. Start conversion in `PNG` mode.
4. Confirm the summary and status list move files through `Queued`, `Converting`, `Done`, and `Failed`.
5. Confirm the final summary says conversion completed with errors.

## Archive Download

1. Wait for the ZIP panel to switch from unavailable to ready.
2. Confirm the panel explicitly says the archive is partial when some files failed.
3. Download the ZIP and verify it contains only successfully converted outputs.

## Failed-File Rerun

1. Use the failed-items rerun action after the first pass completes.
2. Confirm only the failed items return to `Queued`.
3. Start the rerun and verify previously successful items remain done while failed items retry independently.

## Status

- Manual browser verification was not executed in this CLI-only session.
- Run the checklist above before closing task `6.5`.
