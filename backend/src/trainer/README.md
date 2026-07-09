# 🎛️ Node-to-Python SFT Training Bridge

This directory contains the bridge architecture that wraps Python-based **TRL (Transformer Reinforcement Learning)** training workloads inside the Node.js/TypeScript backend.

## 📂 File Directory

| File | Language | Purpose |
| --- | --- | --- |
| `types.ts` | TypeScript | Contains interfaces (`SFTTrainerArgs`, `SFTConfig`, `LoraConfig`) to enforce type-safety and support IDE autocompletion in TypeScript. |
| `NodeSFTTrainer.ts` | TypeScript | Core class orchestrating the lifecycle of the Python process. Spawns the runner, pipes config parameters, and streams/parses log hooks. |
| `bridge.py` | Python | Receives JSON config payloads over `stdin`, downloads model/dataset weights, configures training args, runs `SFTTrainer`, and saves outputs. |
| `verify_types.py` | Python | Introspects Python libraries (`trl`/`peft`) and checks alignment against the TypeScript definitions in `types.ts` to prevent schema drift. |

---

## 🛠️ How It Works

```
[NodeSFTTrainer (TS)]
         │
         │ (1) Spawn python3 bridge.py
         ▼
[Python subprocess] <── (2) Write SFTTrainerArgs JSON via stdin
         │
         │ (3) Load weights & execute training
         ▼
[trl.SFTTrainer] ─── (4) Real-time logs/status via stdout (flush=True) ──> Intercepted in TS
```

### 1. The IPC Protocol
Instead of passing complex configurations as command-line arguments (which are subject to OS limits and escaping issues), Node pipes a single structured JSON payload directly to the Python process's `sys.stdin`. 

### 2. Log Interception & Real-Time Parsing
The Python process flushes all stdout logs immediately. Node intercepts stdout and looks for specific logging hooks:
* `STATUS: <msg>` - Triggered on checkpoint changes (tokenizer loaded, model loaded, dataset parsed). Exposes progress events to callers.
* `SUCCESS: <msg>` - Triggered when training completes successfully and the final weights are saved.
* `ERROR: <msg>` - Triggered on config parsing errors or library initialization crashes.

---

## 🧪 Schema Verification Layer

To prevent API and config drift between the Python libraries (which update independently on GitHub) and your TypeScript type definitions, a schema validator script (`verify_types.py`) runs at build time:
1. Parses `types.ts` using regular expressions to extract field names and expected primitive types.
2. Imports `trl.SFTConfig` and `peft.LoraConfig` dynamically.
3. Introspects the Python dataclass structures using `dataclasses.fields()`.
4. Validates that all TypeScript parameters exist in Python and types align (`string` -> `str`, `number` -> `int`/`float`, `boolean` -> `bool`).

This verification runs automatically as a pre-compile step when executing `npm run build` inside the `backend` folder.

---

## 💻 Code Usage Example

```typescript
import { NodeSFTTrainer } from './trainer/NodeSFTTrainer';

// Define training configuration arguments
const trainer = new NodeSFTTrainer({
  model_id: 'facebook/opt-125m',
  dataset_path: 'imdb',
  dataset_text_field: 'text',
  max_seq_length: 512,
  config: {
    output_dir: './results',
    num_train_epochs: 3,
    per_device_train_batch_size: 4,
    logging_steps: 10,
    bf16: true
  },
  lora: {
    r: 8,
    lora_alpha: 16,
    target_modules: ['q_proj', 'v_proj']
  }
});

async function start() {
  try {
    console.log('Initiating Fine-Tuning Session...');
    await trainer.train((status) => {
      // Real-time status hooks streamed from Python stdout
      console.log(`[Status Event]: ${status}`);
    });
    console.log('Training successfully completed!');
  } catch (error) {
    console.error('Fine-Tuning engine failed:', error);
  }
}

start();
```
