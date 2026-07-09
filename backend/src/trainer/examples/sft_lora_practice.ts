// backend/src/trainer/examples/sft_lora_practice.ts
import { NodeSFTTrainer } from '../NodeSFTTrainer';
import * as path from 'path';

// Model definition (falls back to HuggingFace Hub if local directory does not exist)
const modelName = "HuggingFaceTB/SmolLM2-135M";
const datasetName = "banghua/DL-SFT-Dataset";

const trainer = new NodeSFTTrainer({
  model_id: modelName,
  dataset_path: datasetName,
  dataset_text_field: "messages",
  max_seq_length: 512,
  config: {
    output_dir: path.join(__dirname, '..', '..', '..', 'results', 'smollm2-sft-lora'),
    learning_rate: 1e-4, // LoRA often benefits from slightly higher learning rates
    num_train_epochs: 1,
    per_device_train_batch_size: 1,
    gradient_accumulation_steps: 8,
    logging_steps: 2,
    bf16: false,
    save_strategy: "epoch"
  },
  // Parameter-Efficient Fine-Tuning (LoRA) Configuration
  lora: {
    r: 8,
    lora_alpha: 16,
    target_modules: ["q_proj", "v_proj", "k_proj", "o_proj"],
    lora_dropout: 0.05,
    bias: "none",
    task_type: "CAUSAL_LM"
  }
});

async function run() {
  try {
    console.log("=== Starting SFT LoRA Fine-Tuning Pipeline ===");
    console.log(`Base Model: ${modelName}`);
    console.log(`Dataset: ${datasetName}`);
    
    await trainer.train((status) => {
      console.log(`[Trainer Status Update]: ${status}`);
    });
    
    console.log("=== SFT LoRA Fine-Tuning Pipeline Completed Successfully! ===");
  } catch (error) {
    console.error("=== SFT LoRA Fine-Tuning Pipeline Failed ===");
    console.error(error);
  }
}

run();
