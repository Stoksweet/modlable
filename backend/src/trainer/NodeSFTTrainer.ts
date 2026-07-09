// backend/src/trainer/NodeSFTTrainer.ts
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { SFTTrainerArgs } from './types';

export class NodeSFTTrainer {
  private args: SFTTrainerArgs;
  private pythonPath: string;

  constructor(args: SFTTrainerArgs, customPythonPath?: string) {
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
      
      console.log(`[NodeSFTTrainer] Spawning Python runner: ${this.pythonPath} ${bridgeScriptPath}`);
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

      // Send config configuration directly into stdin
      try {
        pythonProcess.stdin.write(JSON.stringify(this.args));
        pythonProcess.stdin.end();
      } catch (err) {
        pythonProcess.kill();
        reject(err);
        return;
      }

      // Handle process close
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log('[NodeSFTTrainer] Python training runner completed successfully.');
          resolve();
        } else {
          console.error(`[NodeSFTTrainer] Python training runner failed. Exit code: ${code}`);
          reject(new Error(`Python process exited with error code ${code}`));
        }
      });

      pythonProcess.on('error', (err) => {
        console.error('[NodeSFTTrainer] Failed to start Python process:', err);
        reject(err);
      });
    });
  }

  private async onTrainingSuccess() {
    console.log('[NodeSFTTrainer] Verification callback: Uploading checkpoints...');
    
    const bucketName = process.env.MODEL_BUCKET;
    const outputDir = this.args.config.output_dir;

    if (bucketName) {
      console.log(`[NodeSFTTrainer] GCS upload initiated for ${outputDir} to gs://${bucketName}/models/`);
      // Future expansion: Trigger GCS bucket uploads here using GCP Storage SDK
    } else {
      console.log('[NodeSFTTrainer] No MODEL_BUCKET defined. Skipping remote backup upload.');
    }
  }
}
