import type { Sequential, Tensor } from '@tensorflow/tfjs';
import { tf } from './tf';
import { TrainingData } from './training-data';
import { EpochLog } from '../interfaces/training-status.interface';

// Same settings as configureNeuralNetAndTrain in the exemplo-01, except the
// epochs: with ~800 rows, 100 epochs memorizes the data (most scores end at
// 1.00, so the ranking is mostly ties) while 30 generalizes as well and
// trains 3x faster
export const TRAINING_OPTIONS = {
  epochs: 30,
  batchSize: 32,
  learningRate: 0.001,
};

// Dense(128, relu) -> Dense(64, relu) -> Dense(32, relu) -> Dense(1, sigmoid):
// the output is the probability that the user favorites the movie
export function buildModel(
  inputDimension: number,
  learningRate = TRAINING_OPTIONS.learningRate,
): Sequential {
  const model = tf.sequential();

  model.add(
    tf.layers.dense({
      inputShape: [inputDimension],
      units: 128,
      activation: 'relu',
    }),
  );
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

  model.compile({
    loss: 'binaryCrossentropy',
    optimizer: tf.train.adam(learningRate),
    metrics: ['accuracy'],
  });

  return model;
}

export async function trainModel(
  model: Sequential,
  data: TrainingData,
  onEpochEnd?: (log: EpochLog) => void,
  options: Partial<typeof TRAINING_OPTIONS> = {},
): Promise<EpochLog[]> {
  const { epochs, batchSize } = { ...TRAINING_OPTIONS, ...options };
  const history: EpochLog[] = [];

  const inputs = tf.tensor2d(data.inputs);
  const labels = tf.tensor2d(data.labels, [data.labels.length, 1]);

  try {
    await model.fit(inputs, labels, {
      epochs,
      batchSize,
      shuffle: true,
      verbose: 0,
      callbacks: {
        // postMessage({ type: trainingLog }) in the exemplo-01's worker
        onEpochEnd: (epoch, logs) => {
          const log: EpochLog = {
            epoch: epoch + 1,
            loss: logs?.loss ?? 0,
            accuracy: logs?.acc ?? logs?.accuracy ?? 0,
          };
          history.push(log);
          onEpochEnd?.(log);
        },
      },
    });
  } finally {
    // Tensors live outside the JS garbage collector: free them explicitly
    inputs.dispose();
    labels.dispose();
  }

  return history;
}

// Probability (0-1) for each [...userVector, ...movieVector] row
export function predictScores(model: Sequential, inputs: number[][]): number[] {
  if (!inputs.length) {
    return [];
  }

  // tidy disposes every tensor created inside it, keeping memory flat
  return tf.tidy(() =>
    Array.from((model.predict(tf.tensor2d(inputs)) as Tensor).dataSync()),
  );
}

// model.dispose() frees the layers' weights but not the optimizer: Adam keeps
// two moment tensors per weight (plus its beta powers) that would pile up on
// every retrain
export function disposeModel(model: Sequential): void {
  model.optimizer?.dispose();
  model.dispose();
}
