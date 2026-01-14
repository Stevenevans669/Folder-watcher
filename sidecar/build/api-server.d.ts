import { WatchedDir } from './types';
/**
 * Initialize the API server
 */
export declare function startApiServer(directoriesGetter: () => WatchedDir[], port?: number): Promise<number>;
/**
 * Stop the API server
 */
export declare function stopApiServer(): Promise<void>;
