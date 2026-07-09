# backend/src/trainer/bridge.py
import sys
import json
import os
import re
import torch
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer
from trl import SFTTrainer, SFTConfig, DPOTrainer, DPOConfig, GRPOTrainer, GRPOConfig
from peft import LoraConfig

def math_boxed_reward(completions, ground_truth, **kwargs):
    """
    GRPO reward function that scores 1.0 if the final response contains the correct
    numeric answer inside \boxed{}, and 0.0 otherwise.
    """
    rewards = []
    for completion, gt in zip(completions, ground_truth):
        content = completion[0]['content'] if isinstance(completion, list) else completion
        match = re.search(r"\\boxed\{(.*?)\}", content)
        extracted = match.group(1) if match else ""
        rewards.append(1.0 if extracted == gt else 0.0)
    return rewards

reward_functions = {
    "boxed_math": math_boxed_reward
}

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

    trainer_type = args.get('trainer_type', 'sft')
    model_id = args['model_id']
    dataset_path = args['dataset_path']
    config_dict = args['config']
    lora_config_dict = args.get('lora')

    print(f"STATUS: Checking CUDA availability...", flush=True)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"STATUS: Running on device: {device}", flush=True)

    print(f"STATUS: Loading tokenizer for {model_id}...", flush=True)
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    print(f"STATUS: Loading model {model_id}...", flush=True)
    
    # Load model configuration
    torch_dtype = torch.bfloat16 if config_dict.get('bf16') else torch.float32
    device_map = "auto" if torch.cuda.is_available() else None
    
    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        device_map=device_map,
        torch_dtype=torch_dtype
    )

    print(f"STATUS: Loading dataset from {dataset_path}...", flush=True)
    if dataset_path.endswith('.json') or dataset_path.endswith('.jsonl'):
        dataset = load_dataset('json', data_files=dataset_path, split='train')
    elif dataset_path.endswith('.csv'):
        dataset = load_dataset('csv', data_files=dataset_path, split='train')
    else:
        # Load from HuggingFace dataset hub
        dataset = load_dataset(dataset_path, split='train')

    # Apply safety select limit if running locally on CPU (similar to notebooks)
    if not torch.cuda.is_available():
        limit = 10 if trainer_type == 'grpo' else 100
        if len(dataset) > limit:
            print(f"STATUS: CUDA not available. Downsampling dataset to {limit} rows for quick execution.", flush=True)
            dataset = dataset.select(range(limit))

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

    # Initialize correct TRL trainer based on payload type
    if trainer_type == 'sft':
        print("STATUS: Initializing SFTTrainer...", flush=True)
        training_args = SFTConfig(**config_dict)
        trainer = SFTTrainer(
            model=model,
            train_dataset=dataset,
            dataset_text_field=args.get('dataset_text_field', 'messages'),
            max_seq_length=args.get('max_seq_length', 512),
            args=training_args,
            peft_config=peft_config,
        )
    elif trainer_type == 'dpo':
        print("STATUS: Initializing DPOTrainer...", flush=True)
        # SFTConfig and DPOConfig share structural variables, but TRL has separate configs
        training_args = DPOConfig(**config_dict)
        trainer = DPOTrainer(
            model=model,
            ref_model=None, # Auto-clones baseline weights inside DPOTrainer
            args=training_args,
            train_dataset=dataset,
            processing_class=tokenizer,
            peft_config=peft_config,
        )
    elif trainer_type == 'grpo':
        print("STATUS: Initializing GRPOTrainer...", flush=True)
        
        # Post-process mathematical prompts for OpenAI/GSM8K
        if "openai/gsm8k" in dataset_path or "gsm8k" in dataset_path:
            print("STATUS: Formatting GSM8K dataset for GRPO...", flush=True)
            def gsm8k_post_processing(example):
                match = re.search(r"####\s*(-?\d+)", example.get("answer", ""))
                example["ground_truth"] = match.group(1) if match else None
                example["prompt"] = [
                    {"role": "system", "content": "You are a helpful assistant that solves problems step-by-step. Always include the final numeric answer inside \\boxed{}."},
                    {"role": "user", "content": example.get("question", "")}
                ]
                return example
            dataset = dataset.map(gsm8k_post_processing).remove_columns(["question", "answer"])

        training_args = GRPOConfig(**config_dict)
        reward_func_name = args.get('reward_function_type', 'boxed_math')
        reward_func = reward_functions.get(reward_func_name, math_boxed_reward)

        trainer = GRPOTrainer(
            model=model,
            args=training_args,
            reward_funcs=reward_func,
            train_dataset=dataset,
            processing_class=tokenizer,
        )
    else:
        print(f"ERROR: Unknown trainer type: {trainer_type}", flush=True)
        sys.exit(1)

    print(f"STATUS: Fine-tuning training ({trainer_type}) session starting...", flush=True)
    trainer.train()
    
    print("STATUS: Training complete. Saving model...", flush=True)
    trainer.save_model(training_args.output_dir)
    tokenizer.save_pretrained(training_args.output_dir)
    print("SUCCESS: Model saved successfully.", flush=True)

if __name__ == "__main__":
    main()
