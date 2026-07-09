import { SFTTrainerArgs } from './types';
export declare class NodeSFTTrainer {
    private args;
    private pythonPath;
    constructor(args: SFTTrainerArgs, customPythonPath?: string);
    private resolvePythonExecutable;
    train(onProgress?: (progressInfo: string) => void): Promise<void>;
    private onTrainingSuccess;
}
//# sourceMappingURL=NodeSFTTrainer.d.ts.map