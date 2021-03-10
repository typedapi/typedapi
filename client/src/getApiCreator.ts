import { ApiObjectReflection } from "typedapi-core"
import { Connector, ConnectorConfig } from "./Connector"
import { buildApiClient } from "./buildApiClient"

/**
 * Api creator that will be inserted in generated code
 */
export const getApiCreator = function <T>(reflection: ApiObjectReflection) {
    return (config: Omit<ConnectorConfig, "reflection">): T => {
        const cfg = Object.assign(config, { reflection }) as ConnectorConfig
        const connector = new Connector(cfg)
        return buildApiClient(reflection, connector) as T
    }
}