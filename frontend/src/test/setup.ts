import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { MotionGlobalConfig } from 'motion/react';
import { afterEach } from 'vitest';
import { installMatchMedia, resetMedia } from './media';

installMatchMedia();

// 테스트에서는 motion 애니메이션을 건너뛴다. 첫 프레임(opacity 0)과 경합해 toBeVisible이 들쭉날쭉해지지 않게.
MotionGlobalConfig.skipAnimations = true;

afterEach(() => {
  cleanup();
  resetMedia();
});
