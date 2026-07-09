import { GRPOTrainerArgs } from './types';
export declare class NodeGRPOTrainer {
    private args;
    private pythonPath;
    constructor(args: GRPOTrainerArgs, customPythonPath?: string);
    private resolvePythonExecutable;
    train(onProgress?: (progressInfo: string) => void): Promise<void>;
    private onTrainingSuccess;
}
//# sourceMappingURL=NodeGRPOTrainer.d.ts.map