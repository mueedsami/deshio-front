export const SIZE_PRESETS = {
  sneakers: ['30','31','32','33','34','35','36','37','38','39','40','41','42','43','44','45','46','47','48'],
  dresses: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  Bangles: ['2.2', '2.4', '2.6', '2.8', '2.10']

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
