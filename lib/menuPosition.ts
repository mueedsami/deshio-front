export type FloatingMenuPosition = { top: number; left: number };

/**
 * Compute a safe on-screen (viewport) position for a fixed-position menu.
 * - Prefers opening "down" and right-aligned to the trigger.
 * - Flips up if there's not enough space below.
 * - Shifts horizontally if there's not enough space on the right.
 * - Clamps to viewport with a margin.
 */
export function computeMenuPosition(
  rect: DOMRect,
  menuWidth: number,
  menuHeight: number,
  offset = 4,
  margin = 8
): FloatingMenuPosition {
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const spaceRight = window.innerWidth - rect.right;
  const spaceLeft = rect.left;

  // Default: open below, align right edge with trigger's right edge
  let top = rect.bottom + offset;
  let left = rect.right - menuWidth;

  // Flip vertically if needed (prefer up only when it fits better)
  if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
    top = rect.top - menuHeight - offset;
  }

  // Shift horizontally if needed
  if (spaceRight < menuWidth && spaceLeft >= menuWidth) {
    left = rect.left; // align left
  }

  // Clamp to viewport
  const maxTop = window.innerHeight - menuHeight - margin;
  const maxLeft = window.innerWidth - menuWidth - margin;

  top = Math.min(Math.max(top, margin), Math.max(margin, maxTop));
  left = Math.min(Math.max(left, margin), Math.max(margin, maxLeft));

  return { top, left };
}
