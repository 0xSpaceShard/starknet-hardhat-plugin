import exitHook from "exit-hook";

import { IntegratedDevnet } from "../devnet";

export function setupExitCleanup() {
    exitHook(() => {
        IntegratedDevnet.cleanAll();
    });
}
