// backend/src/trainer/examples/dpo_practice.ts
import { NodeDPOTrainer } from '../NodeDPOTrainer';
import * as path from 'path';

// Model definition (falls back to HuggingFace Hub if local directory does not exist)
const modelName = "HuggingFaceTB/SmolLM2-135M-Instruct";
const datasetName = "banghua/DL-DPO-Dataset";

const trainer = new NodeDPOTrainer({
  model_id: modelName,
  dataset_path: datasetName,
  config: {
    output_dir: path.join(__dirname, '..', '..', '..', 'results', 'smollm2-dpo'),
    learning_rate: 5e-5,
    num_train_epochs: 1,
    per_device_train_batch_size: 1,
    gradient_accumulation_steps: 8,
    logging_steps: 2,
    bf16: false,
    save_strategy: "epoch",
    beta: 0.2 // Implicit reward baseline scaling coefficient for DPO
  }
});

async function run() {
  try {
    console.log("=== Starting DPO Alignment Pipeline (Lesson 5 Practice) ===");
    console.log(`Base Model: ${modelName}`);
    console.log(`Dataset: ${datasetName}`);
    
    await trainer.train((status) => {
      console.log(`[Trainer Status Update]: ${status}`);
    });
    
    console.log("=== DPO Alignment Pipeline Completed Successfully! ===");
  } catch (error) {
    console.error("=== DPO Alignment Pipeline Failed ===");
    console.error(error);
  }
}

run();
