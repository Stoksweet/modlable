// backend/src/trainer/examples/online_rl_practice.ts
import { NodeGRPOTrainer } from '../NodeGRPOTrainer';
import * as path from 'path';

// Model definition (falls back to HuggingFace Hub if local directory does not exist)
const modelName = "HuggingFaceTB/SmolLM2-135M-Instruct";
const datasetName = "openai/gsm8k";

const trainer = new NodeGRPOTrainer({
  model_id: modelName,
  dataset_path: datasetName,
  reward_function_type: "boxed_math",
  config: {
    output_dir: path.join(__dirname, '..', '..', '..', 'results', 'smollm2-grpo'),
    learning_rate: 5e-6,
    num_train_epochs: 1,
    per_device_train_batch_size: 1,
    gradient_accumulation_steps: 8,
    logging_steps: 2,
    num_generations: 4, // Group output generation size per training step
    no_cuda: true // Enable CPU fallback locally if CUDA hardware isn't set up
  }
});

async function run() {
  try {
    console.log("=== Starting GRPO Online RL Pipeline (Lesson 7 Practice) ===");
    console.log(`Base Model: ${modelName}`);
    console.log(`Dataset: ${datasetName}`);
    
    await trainer.train((status) => {
      console.log(`[Trainer Status Update]: ${status}`);
    });
    
    console.log("=== GRPO Online RL Pipeline Completed Successfully! ===");
  } catch (error) {
    console.error("=== GRPO Online RL Pipeline Failed ===");
    console.error(error);
  }
}

run();
