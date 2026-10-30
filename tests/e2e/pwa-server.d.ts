export function startDeployment(root: string): Promise<{ origin: string; deployV2(): Promise<void>; close(): Promise<void> }>;
