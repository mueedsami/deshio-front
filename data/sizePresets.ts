export const SIZE_PRESETS = {
  sneakers: ['36 ','37','38','39 (US 6.5)','40 (US 7)','41 (US 8)','42 (US 8.5)','43 (US 9.5)','44 (US 10)','45 (US 11)','46 (US 12)'],
  dresses: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
} as const;

export type SizePresetKey = keyof typeof SIZE_PRESETS;

export const getPresetLabel = (key: SizePresetKey): string => {
  switch (key) {
    case 'sneakers':
      return 'Add all sneaker sizes';
    case 'dresses':
      return 'Add all dress sizes';
    default:
      return 'Add all sizes';
  }
};
