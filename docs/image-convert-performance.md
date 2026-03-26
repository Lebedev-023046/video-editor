# Image Convert Performance Check

## Goal

The image converter should complete a representative HEIC batch in less than 3 minutes without freezing the UI.

## Baseline

- Browser: latest stable Google Chrome on macOS.
- Hardware: Apple Silicon laptop with 16 GB RAM or an equivalent modern developer machine.
- Dataset: 500 HEIC images with mixed portrait and landscape photos between 2 MB and 8 MB each.
- Output format: run once for `PNG` and once for `JPG`.

## Procedure

1. Open the image converter tab in a production build served locally.
2. Start Chrome DevTools Performance recording.
3. Add the 500-file HEIC batch and start conversion.
4. Keep the status list open, switch filters twice during the run, and scroll the list while conversion is active.
5. Stop timing when the ZIP archive becomes downloadable.
6. Repeat once with a mixed-success dataset where roughly 10% of files are intentionally corrupted.

## Pass Criteria

- Total elapsed time stays below 3 minutes.
- The page remains interactive while conversion is running.
- Individual file failures do not stop the remaining files.
- The final ZIP contains only successful outputs, and the UI clearly reports partial success.

## Notes To Capture

- Machine model, browser version, and whether the run was `PNG` or `JPG`.
- Total files, successes, failures, and total elapsed time.
- Any visible jank while scrolling or changing filters during conversion.
