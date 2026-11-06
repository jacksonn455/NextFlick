import type * as TensorFlow from '@tensorflow/tfjs';

export type TensorFlowBackend = 'tfjs-node' | 'tfjs';

// @tensorflow/tfjs-node runs on native TensorFlow (much faster) but only ships
// binaries for some platforms: it works on Linux (WSL, Render) and often fails
// on Windows. @tensorflow/tfjs is pure JavaScript, slower but runs anywhere.
// Both have the same API, so the rest of the code doesn't care which one loaded.
function loadTensorFlow(): {
  tf: typeof TensorFlow;
  backend: TensorFlowBackend;
} {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return { tf: require('@tensorflow/tfjs-node'), backend: 'tfjs-node' };
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return { tf: require('@tensorflow/tfjs'), backend: 'tfjs' };
  }
}

export const { tf, backend: tfBackend } = loadTensorFlow();
