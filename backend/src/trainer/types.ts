// backend/src/trainer/types.ts

export interface LoraConfig {
  r?: number;
  lora_alpha?: number;
  target_modules?: string[];
  lora_dropout?: number;
  bias?: "none" | "all" | "lora_only";
  task_type?: string;
}

export interface SFTConfig {
  output_dir: string;
  per_device_train_batch_size?: number;
  gradient_accumulation_steps?: number;
  learning_rate?: number;
  logging_steps?: number;
  max_steps?: number;
  num_train_epochs?: number;
  fp16?: boolean;
  bf16?: boolean;
  save_strategy?: "no" | "steps" | "epoch";
  save_steps?: number;
  evaluation_strategy?: "no" | "steps" | "epoch";
  eval_steps?: number;
  report_to?: string[];
}

export interface SFTTrainerArgs {
  model_id: string;
  dataset_path: string; // Path to local JSON/JSONL/CSV or HuggingFace Hub name
  dataset_text_field: string;
  max_seq_length?: number;
  config: SFTConfig;
  lora?: LoraConfig;  // Optional parameter for PEFT/LoRA fine-tuning
}
