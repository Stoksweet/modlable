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
exports.NodeDPOTrainer = void 0;
// backend/src/trainer/NodeDPOTrainer.ts
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class NodeDPOTrainer {
    args;
    pythonPath;
    constructor(args, customPythonPath) {
        this.args = args;
        this.pythonPath = customPythonPath || this.resolvePythonExecutable();
    }
    resolvePythonExecutable() {
        const venvPython = path.join(__dirname, '..', '..', '.venv', 'bin', 'python');
        if (fs.existsSync(venvPython)) {
            return venvPython;
        }
        return 'python3'; // Fallback to system default
    }
    async train(onProgress) {
        return new Promise((resolve, reject) => {
            const bridgeScriptPath = path.join(__dirname, 'bridge.py');
            console.log(`[NodeDPOTrainer] Spawning Python runner: ${this.pythonPath} ${bridgeScriptPath}`);
            const pythonProcess = (0, child_process_1.spawn)(this.pythonPath, [bridgeScriptPath]);
            // Stream stdout and parse hooks
            pythonProcess.stdout.on('data', (data) => {
                const lines = data.toString().split('\n');
                for (let line of lines) {
                    line = line.trim();
                    if (!line)
                        continue;
                    console.log(`[Python Stdout]: ${line}`);
                    if (line.startsWith('STATUS:')) {
                        const statusMsg = line.replace('STATUS:', '').trim();
                        if (onProgress)
                            onProgress(statusMsg);
                    }
                    else if (line.startsWith('SUCCESS:')) {
                        this.onTrainingSuccess();
                    }
                    else if (line.startsWith('ERROR:')) {
                        const errorMsg = line.replace('ERROR:', '').trim();
                        console.error(`[Trainer Error]: ${errorMsg}`);
                    }
                }
            });
            // Stream stderr (warnings, progress logs, etc.)
            pythonProcess.stderr.on('data', (data) => {
                const errorStr = data.toString().trim();
                if (errorStr) {
                    console.warn(`[Python Stderr/Warning]: ${errorStr}`);
                }
            });
            // Send config configuration directly into stdin along with trainer_type
            try {
                const payload = {
                    ...this.args,
                    trainer_type: 'dpo'
                };
                pythonProcess.stdin.write(JSON.stringify(payload));
                pythonProcess.stdin.end();
            }
            catch (err) {
                pythonProcess.kill();
                reject(err);
                return;
            }
            // Handle process close
            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('[NodeDPOTrainer] Python training runner completed successfully.');
                    resolve();
                }
                else {
                    console.error(`[NodeDPOTrainer] Python training runner failed. Exit code: ${code}`);
                    reject(new Error(`Python process exited with error code ${code}`));
                }
            });
            pythonProcess.on('error', (err) => {
                console.error('[NodeDPOTrainer] Failed to start Python process:', err);
                reject(err);
            });
        });
    }
    async onTrainingSuccess() {
        console.log('[NodeDPOTrainer] Verification callback: Uploading checkpoints...');
    }
}
exports.NodeDPOTrainer = NodeDPOTrainer;
//# sourceMappingURL=NodeDPOTrainer.js.map