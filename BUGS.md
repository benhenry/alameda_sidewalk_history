# Known Bugs

## Current Issues

_No current issues._

## Resolved Issues

### Admin segment preview (Fixed 2025-12-25)
- **Problem**: In admin page, pending segment approvals could not be previewed on the map
- **Resolution**: Added `onPreviewSegment` prop and "Preview on Map" button with 5-second auto-clear highlighting

### Sidewalk snapping drawing on houses (Fixed 2025-12-25)
- **Problem**: In logged-in page, when adding a segment, snapping to sidewalks was not working perfectly. Users could draw on top of houses.
- **Resolution**: Implemented intelligent 50-meter distance-based snapping with PostGIS ST_ClosestPoint

### Street field doesn't allow spaces (Fixed 2025-12-25)
- **Problem**: In logged-in page, the street field didn't allow for spaces
- **Resolution**: Changed validation timing from `onChange` to `onBlur`, added permissive validation with warnings
