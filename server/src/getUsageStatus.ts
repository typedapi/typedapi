import * as nodeOsUtils from "node-os-utils"

export interface UsageStatusInterface {
    cpu: number
    memory: number
    drive: number
}

export const getUsageStatus = async (): Promise<UsageStatusInterface> => {

    let cpu = 0, memory = 0, drive = 0

    const getCpu = async () => {
        cpu = await nodeOsUtils.cpu.usage()
    }

    const getMemory = async () => {
        memory = 100 - (await nodeOsUtils.mem.info()).freeMemPercentage
    }

    const getDrive = async () => {
        drive = (await nodeOsUtils.drive.used("/")).usedPercentage
    }

    await Promise.all([getCpu(), getMemory(), getDrive()])

    return { cpu, memory, drive }
    
}