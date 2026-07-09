"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/trainer/examples/sft_lora_practice.ts
const NodeSFTTrainer_1 = require("../NodeSFTTrainer");
const path = __importStar(require("path"));
// Model definition (falls back to HuggingFace Hub if local directory does not exist)
const modelName = "HuggingFaceTB/SmolLM2-135M";
const datasetName = "banghua/DL-SFT-Dataset";
const trainer = new NodeSFTTrainer_1.NodeSFTTrainer({
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
    }
    catch (error) {
        console.error("=== SFT LoRA Fine-Tuning Pipeline Failed ===");
        console.error(error);
    }
}
run();
//# sourceMappingURL=sft_lora_practice.js.map