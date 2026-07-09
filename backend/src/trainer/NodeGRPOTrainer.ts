// backend/src/trainer/NodeGRPOTrainer.ts
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { GRPOTrainerArgs } from './types';

export class NodeGRPOTrainer {
  private args: GRPOTrainerArgs;
  private pythonPath: string;

  constructor(args: GRPOTrainerArgs, customPythonPath?: string) {
    this.args = args;
    this.pythonPath = customPythonPath || this.resolvePythonExecutable();
  }

  private resolvePythonExecutable(): string {
    const venvPython = path.join(__dirname, '..', '..', '.venv', 'bin', 'python');
    if (fs.existsSync(venvPython)) {
      return venvPython;
    }
    return 'python3'; // Fallback to system default
  }

  public async train(onProgress?: (progressInfo: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const bridgeScriptPath = path.join(__dirname, 'bridge.py');
      
      console.log(`[NodeGRPOTrainer] Spawning Python runner: ${this.pythonPath} ${bridgeScriptPath}`);
      const pythonProcess = spawn(this.pythonPath, [bridgeScriptPath]);

      // Stream stdout and parse hooks
      pythonProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (let line of lines) {
          line = line.trim();
          if (!line) continue;

          console.log(`[Python Stdout]: ${line}`);

          if (line.startsWith('STATUS:')) {
            const statusMsg = line.replace('STATUS:', '').trim();
            if (onProgress) onProgress(statusMsg);
          } else if (line.startsWith('SUCCESS:')) {
            this.onTrainingSuccess();
          } else if (line.startsWith('ERROR:')) {
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
          trainer_type: 'grpo'
        };
        pythonProcess.stdin.write(JSON.stringify(payload));
        pythonProcess.stdin.end();
      } catch (err) {
        pythonProcess.kill();
        reject(err);
        return;
      }

      // Handle process close
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log('[NodeGRPOTrainer] Python training runner completed successfully.');
          resolve();
        } else {
          console.error(`[NodeGRPOTrainer] Python training runner failed. Exit code: ${code}`);
          reject(new Error(`Python process exited with error code ${code}`));
        }
      });

      pythonProcess.on('error', (err) => {
        console.error('[NodeGRPOTrainer] Failed to start Python process:', err);
        reject(err);
      });
    });
  }

  private async onTrainingSuccess() {
    console.log('[NodeGRPOTrainer] Verification callback: Uploading checkpoints...');
  }
}
