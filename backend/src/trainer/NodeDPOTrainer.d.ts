import { DPOTrainerArgs } from './types';
export declare class NodeDPOTrainer {
    private args;
    private pythonPath;
    constructor(args: DPOTrainerArgs, customPythonPath?: string);
    private resolvePythonExecutable;
    train(onProgress?: (progressInfo: string) => void): Promise<void>;
    private onTrainingSuccess;
}
//# sourceMappingURL=NodeDPOTrainer.d.ts.map