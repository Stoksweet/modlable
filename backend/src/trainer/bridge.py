# backend/src/trainer/bridge.py
import sys
import json
import os
import torch
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer
from trl import SFTTrainer, SFTConfig
from peft import LoraConfig, get_peft_model

def main():
    # Force stdout to flush immediately for real-time streaming to Node
    print("STATUS: Waiting for configuration from Node.js...", flush=True)
    
    # Read the full JSON configuration payload from stdin
    try:
        input_data = sys.stdin.read()
        args = json.loads(input_data)
    except Exception as e:
        print(f"ERROR: Failed to parse input configuration JSON: {str(e)}", flush=True)
        sys.exit(1)

    model_id = args['model_id']
    dataset_path = args['dataset_path']
    dataset_text_field = args['dataset_text_field']
    max_seq_length = args.get('max_seq_length', 512)
    sft_config_dict = args['config']
    lora_config_dict = args.get('lora')

    print(f"STATUS: Checking CUDA availability...", flush=True)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"STATUS: Running on device: {device}", flush=True)

    print(f"STATUS: Loading tokenizer for {model_id}...", flush=True)
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    print(f"STATUS: Loading model {model_id}...", flush=True)
    # Using device_map="auto" to let Accelerate distribute weights across available GPUs
    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        device_map="auto" if torch.cuda.is_available() else None,
        torch_dtype=torch.bfloat16 if sft_config_dict.get('bf16') else torch.float32
    )

    print(f"STATUS: Loading dataset from {dataset_path}...", flush=True)
    if dataset_path.endswith('.json') or dataset_path.endswith('.jsonl'):
        dataset = load_dataset('json', data_files=dataset_path, split='train')
    elif dataset_path.endswith('.csv'):
        dataset = load_dataset('csv', data_files=dataset_path, split='train')
    else:
        # Load directly from HuggingFace dataset hub
        dataset = load_dataset(dataset_path, split='train')

    # Configure training arguments
    training_args = SFTConfig(**sft_config_dict)

    # Optional PEFT (LoRA) Setup
    peft_config = None
    if lora_config_dict:
        print("STATUS: Setting up PEFT/LoRA configuration...", flush=True)
        peft_config = LoraConfig(
            r=lora_config_dict.get('r', 8),
            lora_alpha=lora_config_dict.get('lora_alpha', 16),
            target_modules=lora_config_dict.get('target_modules', ["q_proj", "v_proj"]),
            lora_dropout=lora_config_dict.get('lora_dropout', 0.05),
            bias=lora_config_dict.get('bias', "none"),
            task_type=lora_config_dict.get('task_type', "CAUSAL_LM")
        )

    print("STATUS: Initializing SFTTrainer...", flush=True)
    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset,
        dataset_text_field=dataset_text_field,
        max_seq_length=max_seq_length,
        args=training_args,
        peft_config=peft_config,
    )

    print("STATUS: Fine-tuning training session starting...", flush=True)
    trainer.train()
    
    print("STATUS: Fine-tuning complete. Saving model...", flush=True)
    trainer.save_model(training_args.output_dir)
    tokenizer.save_pretrained(training_args.output_dir)
    print("SUCCESS: Model saved successfully.", flush=True)

if __name__ == "__main__":
    main()
