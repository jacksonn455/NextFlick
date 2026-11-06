import {
  buildModel,
  disposeModel,
  predictScores,
  trainModel,
} from '../../../../../src/modules/recommendations/ml/model';
import { tf } from '../../../../../src/modules/recommendations/ml/tf';
import { TrainingData } from '../../../../../src/modules/recommendations/ml/training-data';

// A pattern a network learns in a few epochs: label = first input
const data: TrainingData = {
  inputs: [
    [1, 0],
    [1, 1],
    [0, 0],
    [0, 1],
  ],
  labels: [1, 1, 0, 0],
  inputDimension: 2,
  positives: 2,
  negatives: 2,
  users: 1,
};

describe('model', () => {
  it('should build the network of the exemplo-01 with one probability as output', () => {
    const model = buildModel(10);

    expect(model.layers.map((layer) => layer.getConfig().units)).toEqual([
      128, 64, 32, 1,
    ]);
    expect(model.outputs[0].shape).toEqual([null, 1]);
    model.dispose();
  });

  it('should report every epoch and learn the pattern', async () => {
    const model = buildModel(2, 0.05);
    const epochs: number[] = [];

    const history = await trainModel(
      model,
      data,
      (log) => epochs.push(log.epoch),
      { epochs: 60, batchSize: 4 },
    );

    expect(epochs).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
    expect(history.at(-1)!.loss).toBeLessThan(history[0].loss);

    const [high, low] = predictScores(model, [
      [1, 0],
      [0, 0],
    ]);
    expect(high).toBeGreaterThan(low);
    model.dispose();
  }, 30000);

  it('should return one probability between 0 and 1 per row', () => {
    const model = buildModel(2);

    const scores = predictScores(model, data.inputs);

    expect(scores).toHaveLength(4);
    scores.forEach((score) => {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
    model.dispose();
  });

  it('should return no scores for no rows', () => {
    const model = buildModel(2);

    expect(predictScores(model, [])).toEqual([]);
    model.dispose();
  });

  it('should free every tensor of a trained model, optimizer included', async () => {
    const before = tf.memory().numTensors;

    const model = buildModel(2);
    await trainModel(model, data, undefined, { epochs: 2 });
    predictScores(model, data.inputs);
    disposeModel(model);

    expect(tf.memory().numTensors).toBe(before);
  });
});
