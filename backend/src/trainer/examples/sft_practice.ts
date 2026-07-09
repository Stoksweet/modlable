// backend/src/trainer/examples/sft_practice.ts
import { NodeSFTTrainer } from '../NodeSFTTrainer';
import * as path from 'path';

// Model definition (falls back to HuggingFace Hub if local directory does not exist)
const modelName = "HuggingFaceTB/SmolLM2-135M";
const datasetName = "banghua/DL-SFT-Dataset";

const trainer = new NodeSFTTrainer({
  model_id: modelName,
  dataset_path: datasetName,
  dataset_text_field: "messages", // SFTTrainer handles 'messages' column with chat templates automatically
  max_seq_length: 512,
  config: {
    output_dir: path.join(__dirname, '..', '..', '..', 'results', 'smollm2-sft'),
    learning_rate: 8e-5,
    num_train_epochs: 1,
    per_device_train_batch_size: 1,
    gradient_accumulation_steps: 8,
    logging_steps: 2,
    bf16: false, // Set to true if GPU supports bfloat16 (e.g. A100, H100, RTX 3090/4090)
    save_strategy: "epoch"
  }
});

async function run() {
  try {
    console.log("=== Starting SFT Fine-Tuning Pipeline (Lesson 3 Practice) ===");
    console.log(`Base Model: ${modelName}`);
    console.log(`Dataset: ${datasetName}`);
    
    await trainer.train((status) => {
      console.log(`[Trainer Status Update]: ${status}`);
    });
    
    console.log("=== SFT Fine-Tuning Pipeline Completed Successfully! ===");
  } catch (error) {
    console.error("=== SFT Fine-Tuning Pipeline Failed ===");
    console.error(error);
  }
}

run();
