# 🎛️ Node-to-Python Alignment & Training Bridge

This directory contains the bridge architecture that wraps Python-based **TRL (Transformer Reinforcement Learning)** alignment and training workloads inside the Node.js/TypeScript backend.

## 📂 File Directory

| File | Language | Purpose |
| --- | --- | --- |
| `types.ts` | TypeScript | Contains configuration interfaces (`SFTTrainerArgs`, `DPOTrainerArgs`, `GRPOTrainerArgs`, etc.) to enforce type-safety and support IDE autocompletion in TypeScript. |
| `NodeSFTTrainer.ts` | TypeScript | Wrapper class for Supervised Fine-Tuning (SFT) processes. Spawns `bridge.py` and feeds SFT configuration payloads. |
| `NodeDPOTrainer.ts` | TypeScript | Wrapper class for Direct Preference Optimization (DPO) alignment. Spawns `bridge.py` and feeds preferred output pairs. |
| `NodeGRPOTrainer.ts` | TypeScript | Wrapper class for Group Relative Policy Optimization (GRPO/Online RL). Spawns `bridge.py` and configures reward functions. |
| `bridge.py` | Python | Unified Python backend. Receives payloads via `stdin`, downloads model/dataset weights, and runs the designated TRL trainer (`SFTTrainer`, `DPOTrainer`, or `GRPOTrainer`). |
| `verify_types.py` | Python | Introspects Python libraries (`trl`/`peft`) and checks alignment against the TypeScript definitions in `types.ts` to prevent schema drift. |
| `examples/sft_practice.ts` | TypeScript | Example script based on `Lesson_3_STF_Practice.ipynb` performing full SFT on `SmolLM2-135M` using the instruction dataset. |
| `examples/sft_lora_practice.ts` | TypeScript | Example script demonstrating Parameter-Efficient Fine-Tuning (PEFT/LoRA) configuration with the SFT trainer wrapper. |
| `examples/dpo_practice.ts` | TypeScript | Example script based on `Lesson_5_DPO_Practice.ipynb` performing Direct Preference Optimization alignment. |
| `examples/online_rl_practice.ts` | TypeScript | Example script based on `Lesson_7_Online_RL.ipynb` performing GRPO Online RL with rule-based reward scoring. |

---

## 🛠️ How It Works

```
[NodeTrainerWrapper (TS)]
         │
         │ (1) Spawn python3 bridge.py
         ▼
[Python subprocess] <── (2) Write TrainerArgs JSON (including trainer_type) via stdin
         │
         │ (3) Load weights & execute training
         ▼
[trl.SFT/DPO/GRPOTrainer] ─── (4) Real-time logs/status via stdout ──> Intercepted in TS
```

### 1. The IPC Protocol
Instead of passing complex configurations as command-line arguments (which are subject to OS limits and escaping issues), Node pipes a single structured JSON payload directly to the Python process's `sys.stdin`. The payload contains a `trainer_type` field (`sft`, `dpo`, or `grpo`) to select the training path.

### 2. Log Interception & Real-Time Parsing
The Python process flushes all stdout logs immediately. Node intercepts stdout and looks for specific logging hooks:
* `STATUS: <msg>` - Triggered on checkpoint changes (tokenizer loaded, model loaded, dataset parsed). Exposes progress events to callers.
* `SUCCESS: <msg>` - Triggered when training completes successfully and the final weights are saved.
* `ERROR: <msg>` - Triggered on config parsing errors or library initialization crashes.

---

## 🧪 Schema Verification Layer

To prevent API and config drift between the Python libraries (which update independently on GitHub) and your TypeScript type definitions, a schema validator script (`verify_types.py`) runs at build time:
1. Parses `types.ts` using regular expressions to extract field names and expected primitive types.
2. Imports `trl.SFTConfig`, `trl.DPOConfig`, `trl.GRPOConfig` and `peft.LoraConfig` dynamically.
3. Introspects the Python dataclass structures using `dataclasses.fields()`.
4. Validates that all TypeScript parameters exist in Python and types align (`string` -> `str`, `number` -> `int`/`float`, `boolean` -> `bool`).

This verification runs automatically as a pre-compile step when executing `npm run build` inside the `backend` folder.
