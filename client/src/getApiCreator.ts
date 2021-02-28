import { ApiObjectReflection } from "typedapi-core"
import { Connector, ConnectorConfig } from "./Connector"
import { buildApiClient } from "./buildApiClient"

/**
 * Api creator that will be inserted in generated code
 */
export const getApiCreator = function <T>(reflection: ApiObjectReflection) {
    return (config: ConnectorConfig): T => {
        const connector = new Connector(config)
        return buildApiClient(reflection, connector) as T
    }
}