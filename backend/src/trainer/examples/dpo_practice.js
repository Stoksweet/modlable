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
// backend/src/trainer/examples/dpo_practice.ts
const NodeDPOTrainer_1 = require("../NodeDPOTrainer");
const path = __importStar(require("path"));
// Model definition (falls back to HuggingFace Hub if local directory does not exist)
const modelName = "HuggingFaceTB/SmolLM2-135M-Instruct";
const datasetName = "banghua/DL-DPO-Dataset";
const trainer = new NodeDPOTrainer_1.NodeDPOTrainer({
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
    }
    catch (error) {
        console.error("=== DPO Alignment Pipeline Failed ===");
        console.error(error);
    }
}
run();
//# sourceMappingURL=dpo_practice.js.map