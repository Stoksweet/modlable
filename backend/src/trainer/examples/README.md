# 📘 Post-Training Implementation Guide: Lessons 3, 5, and 7

This documentation guide outlines the post-training and alignment algorithms covered in the lesson notebooks and details how they are implemented using the **TypeScript-to-Python Bridge** architecture.

---

## 🏗️ Alignment Control Plane Architecture

In modern LLM development, alignment methodologies are computationally intensive. Modlable uses a **Node.js/TypeScript Control Plane** to manage workflows, datasets, and events, while spawning an isolated **Python Execution Engine** to perform the heavy training loops.

```
┌─────────────────────────────────────────┐
│       Node.js Control Plane (TS)        │
│  - Configuration & Type Constraints     │
│  - Process Spawner (child_process)      │
│  - SSE/Websocket Client Progress Stream │
└────────────────────┬────────────────────┘
                     │
                     │ Pipes SFT/DPO/GRPO Args via JSON
                     ▼
┌─────────────────────────────────────────┐
│     Python Execution Engine (PyTorch)   │
│  - Introspection & verification layer   │
│  - trl / transformers / peft pipelines  │
│  - Hardware-optimized Training Loops    │
└─────────────────────────────────────────┘
```

---

## 📚 Lesson 1: Supervised Fine-Tuning (SFT) — Lesson 3

### 💡 Core Concept
Supervised Fine-Tuning (SFT) is the first step of post-training. It adapts a raw pretrained base model to understand and respond to human instructions by training on high-quality instruction-response pairs (often using ChatML templates).

* **Model Used**: `HuggingFaceTB/SmolLM2-135M`
* **Dataset**: `banghua/DL-SFT-Dataset` (Conversational format)

### 🐍 Python Notebook Reference
```python
sft_config = SFTConfig(
    learning_rate=8e-5,
    num_train_epochs=1,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=8,
    logging_steps=2,
)
sft_trainer = SFTTrainer(
    model=model,
    args=sft_config,
    train_dataset=train_dataset,
    processing_class=tokenizer,
)
sft_trainer.train()
```

### 🟦 TypeScript Bridge Implementation
SFT is fully supported. The configuration is constructed as a strongly-typed TypeScript object and passed directly to the `NodeSFTTrainer` class:

* **File**: `sft_practice.ts`
```typescript
import { NodeSFTTrainer } from '../NodeSFTTrainer';
import * as path from 'path';

const trainer = new NodeSFTTrainer({
  model_id: "HuggingFaceTB/SmolLM2-135M",
  dataset_path: "banghua/DL-SFT-Dataset",
  dataset_text_field: "messages",
  max_seq_length: 512,
  config: {
    output_dir: path.join(__dirname, '..', '..', '..', 'results', 'smollm2-sft'),
    learning_rate: 8e-5,
    num_train_epochs: 1,
    per_device_train_batch_size: 1,
    gradient_accumulation_steps: 8,
    logging_steps: 2,
    bf16: false,
    save_strategy: "epoch"
  }
});

// Runs the training loop, capturing stdout progress updates in real-time
await trainer.train((status) => {
  console.log(`[SFT Progress]: ${status}`);
});
```

---

## 📚 Lesson 2: Direct Preference Optimization (DPO) — Lesson 5

### 💡 Core Concept
Direct Preference Optimization (DPO) aligns instruction-following models to human preferences (e.g., choosing helpful, safe answers over toxic or unhelpful ones). DPO bypasses the complex Reinforcement Learning from Human Feedback (RLHF) step of training an auxiliary reward model, directly optimizing the policy using a dataset of paired preferred (`chosen`) and dispreferred (`rejected`) responses.

* **Model Used**: `HuggingFaceTB/SmolLM2-135M-Instruct`
* **Dataset**: `banghua/DL-DPO-Dataset` (preference format containing `chosen` and `rejected` fields)

### 🐍 Python Notebook Reference
```python
config = DPOConfig(
    beta=0.2, 
    per_device_train_batch_size=1,
    gradient_accumulation_steps=8,
    num_train_epochs=1,
    learning_rate=5e-5,
    logging_steps=2,
)
dpo_trainer = DPOTrainer(
    model=model,
    ref_model=None,
    args=config,    
    processing_class=tokenizer,  
    train_dataset=dpo_ds
)
dpo_trainer.train()
```

### 🟦 TypeScript Bridge Implementation
DPO is fully supported. The configuration is constructed using the DPO interfaces and executed via the `NodeDPOTrainer` class:

* **File**: `dpo_practice.ts`
```typescript
import { NodeDPOTrainer } from '../NodeDPOTrainer';
import * as path from 'path';

const trainer = new NodeDPOTrainer({
  model_id: "HuggingFaceTB/SmolLM2-135M-Instruct",
  dataset_path: "banghua/DL-DPO-Dataset",
  config: {
    output_dir: path.join(__dirname, '..', '..', '..', 'results', 'smollm2-dpo'),
    learning_rate: 5e-5,
    num_train_epochs: 1,
    per_device_train_batch_size: 1,
    gradient_accumulation_steps: 8,
    logging_steps: 2,
    bf16: false,
    save_strategy: "epoch",
    beta: 0.2 // DPO reward coefficient
  }
});

await trainer.train((status) => {
  console.log(`[DPO Progress]: ${status}`);
});
```

---

## 📚 Lesson 3: Online Reinforcement Learning (GRPO) — Lesson 7

### 💡 Core Concept
Group Relative Policy Optimization (GRPO) is an online RL algorithm designed for reasoning tasks (like math and coding). Instead of training a separate critic network to estimate a state baseline, GRPO samples a group of outputs (e.g., $G = 4$ or $G = 16$ completions) for a given prompt, scores them using a rule-based reward function (e.g. comparing the final numeric response in `\boxed{}`), and normalizes the advantages relative to the group average.

* **Model Used**: `HuggingFaceTB/SmolLM2-135M-Instruct`
* **Dataset**: `openai/gsm8k` (Math word problems)

### 🐍 Python Notebook Reference
```python
def reward_func(completions, ground_truth, **kwargs):
    # Regex search to extract text inside \boxed{}
    matches = [re.search(r"\\boxed\{(.*?)\}", c[0]['content']) for c in completions]
    contents = [m.group(1) if m else "" for m in matches]
    return [1.0 if c == gt else 0.0 for c, gt in zip(contents, ground_truth)]

config = GRPOConfig(
    per_device_train_batch_size=1,
    gradient_accumulation_steps=8,
    num_generations=4, # Group size
    num_train_epochs=1,
    learning_rate=5e-6,
    logging_steps=2,
)
grpo_trainer = GRPOTrainer(
    model=model,
    args=config,
    reward_funcs=reward_func,
    train_dataset=train_dataset
)
grpo_trainer.train()
```

### 🟦 TypeScript Bridge Implementation
GRPO is fully supported. The bridge contains built-in dispatch tables for mathematical reasoning reward evaluation. It is executed via the `NodeGRPOTrainer` class:

* **File**: `online_rl_practice.ts`
```typescript
import { NodeGRPOTrainer } from '../NodeGRPOTrainer';
import * as path from 'path';

const trainer = new NodeGRPOTrainer({
  model_id: "HuggingFaceTB/SmolLM2-135M-Instruct",
  dataset_path: "openai/gsm8k",
  reward_function_type: "boxed_math",
  config: {
    output_dir: path.join(__dirname, '..', '..', '..', 'results', 'smollm2-grpo'),
    learning_rate: 5e-6,
    num_train_epochs: 1,
    per_device_train_batch_size: 1,
    gradient_accumulation_steps: 8,
    logging_steps: 2,
    num_generations: 4, // Sampling count per prompt
    no_cuda: true
  }
});

await trainer.train((status) => {
  console.log(`[GRPO Progress]: ${status}`);
});
```

---

## ⚡ Execution Command Interface

To compile and run any of the example scripts, execute the following commands in the `backend/` directory:

```bash
# 1. Compile all TypeScript examples
npm run build

# 2. Run the SFT Fine-Tuning example script
node lib/trainer/examples/sft_practice.js

# 3. Run the SFT with PEFT/LoRA example script
node lib/trainer/examples/sft_lora_practice.js

# 4. Run the DPO Alignment example script
node lib/trainer/examples/dpo_practice.js

# 5. Run the GRPO Online RL example script
node lib/trainer/examples/online_rl_practice.js
```
