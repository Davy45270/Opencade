export function startDeployment(root: string): Promise<{ origin: string; deployV2(options?: { keepWorker?: boolean }): Promise<void>; close(): Promise<void> }>;
