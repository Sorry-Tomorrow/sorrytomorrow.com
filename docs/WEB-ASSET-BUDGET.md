# Web asset budget

Canonical masters remain immutable. A browser-optimized derivative is a publication asset and must be included in Approval 3 before it replaces a master on the website.

## Interim diagnostic ceiling

- Review any episode whose displayed comic art exceeds 15 MiB before release.
- Report the current catalog with `npm run report:payload`.
- The ceiling is a review trigger, not permission to recompress approved work after approval.

## Approved derivative requirements

A proposed derivative must:

- preserve complete story content and reading order;
- preserve exact lettering and color intent at native size and width 430;
- pass color, grayscale, sharp-edge, and text-legibility comparison;
- record source and derivative hashes, dimensions, encoder settings, and byte savings;
- include a lossless or approved fallback when the selected browser format needs one;
- remain separate from the private canonical master.

Do not embed a complete font file separately inside every website panel when the same visual result can be delivered by an approved raster derivative or a shared/subset font architecture. Do not change the public asset merely because a smaller unreviewed file exists.
