import { scaleFont as fs, scaleLineHeight as lh } from './fontScale';

export const typography = {
  h1: {
    fontFamily: 'Saveful-Bold',
    fontSize: fs(48),
    lineHeight: lh(48, 50),
    letterSpacing: 0.2,
    textTransform: 'uppercase' as const,
  },
  h2: {
    fontFamily: 'Saveful-Bold',
    fontSize: fs(40),
    lineHeight: lh(40, 42),
    letterSpacing: 0.2,
    textTransform: 'uppercase' as const,
  },
  h3: {
    fontFamily: 'Saveful-Bold',
    fontSize: fs(32),
    lineHeight: lh(32, 35),
    textTransform: 'uppercase' as const,
  },
  h4: {
    fontFamily: 'Saveful-Bold',
    fontSize: fs(28),
    lineHeight: lh(28, 31),
    textTransform: 'uppercase' as const,
  },
  h5: {
    fontFamily: 'Saveful-Bold',
    fontSize: fs(26),
    lineHeight: lh(26, 30),
    textTransform: 'uppercase' as const,
  },
  h6: {
    fontFamily: 'Saveful-Bold',
    fontSize: fs(22),
    lineHeight: lh(22, 25),
    textTransform: 'uppercase' as const,
  },
  h7: {
    fontFamily: 'Saveful-Bold',
    fontSize: fs(20),
    lineHeight: lh(20, 23),
    textTransform: 'uppercase' as const,
  },
  h8: {
    fontFamily: 'Saveful-Bold',
    fontSize: fs(18),
    lineHeight: lh(18, 20),
    textTransform: 'uppercase' as const,
  },
  title: {
    fontFamily: 'Saveful-Bold',
    fontSize: fs(28),
    lineHeight: lh(28, 31),
    textTransform: 'uppercase' as const,
  },
  heading: {
    fontFamily: 'Saveful-Bold',
    fontSize: fs(24),
    lineHeight: lh(24, 25),
    textTransform: 'uppercase' as const,
  },
  subheading: {
    fontFamily: 'Saveful-Bold',
    fontSize: fs(20),
    lineHeight: lh(20, 23),
  },
  body: {
    fontFamily: 'Saveful-Regular',
    fontSize: fs(16),
    lineHeight: lh(16, 18),
    textTransform: 'uppercase' as const,
  },
  body1: {
    fontFamily: 'Saveful-Regular',
    fontSize: fs(16),
  },
  bodyLarge: {
    fontFamily: 'Saveful-Regular',
    fontSize: fs(18),
    lineHeight: lh(18, 20),
  },
  bodyBold: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: fs(16),
    lineHeight: lh(16, 18),
  },
  bodyBold1: {
    fontFamily: 'Saveful-Bold',
    fontSize: fs(16),
    lineHeight: lh(16, 18),
  },
  bodySmall: {
    fontFamily: 'Saveful-Regular',
    fontSize: fs(14),
    lineHeight: lh(14, 15),
  },
  label: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: fs(18),
    lineHeight: lh(18, 20),
  },
  caption: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: fs(12),
    lineHeight: lh(12, 14),
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  metric: {
    fontFamily: 'Saveful-Bold',
    fontSize: fs(36),
    lineHeight: lh(36, 39),
  },
  counter: {
    fontFamily: 'Saveful-Bold',
    fontSize: fs(72),
    lineHeight: lh(72, 80),
  },
};
