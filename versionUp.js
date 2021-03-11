const fs = require("fs")
const availableOptions = ["patch", "minor", "major"]
const selectedOption = process.argv[process.argv.length - 1]
if (availableOptions.indexOf(selectedOption) === -1) {
    console.log("Bad option: " + selectedOption)
    console.log("Available options: " + availableOptions.join(", "))
    process.exit(1)
}

const subProjects = ["client", "client-browser-http", "client-browser-ws", "core", "parser", "redis-signaling", "server", "server-ws"]

const currentJsonData = JSON.parse(fs.readFileSync(__dirname + "/package.json"))
const currentVersionString = currentJsonData.version

const versionsArray = currentVersionString.split(".").map(v => parseInt(v))

if (selectedOption === "patch") {
    versionsArray[2]++
}

if (selectedOption === "minor") {
    versionsArray[1]++
    versionsArray[2] = 0
}

if (selectedOption === "major") {
    versionsArray[0]++
    versionsArray[1] = 0
    versionsArray[2] = 0
}

const newVersionString = versionsArray.join(".")

console.log("Old version: ", currentVersionString)
console.log("New version: ", newVersionString)

currentJsonData.version = newVersionString
fs.writeFileSync(__dirname + "/package.json", JSON.stringify(currentJsonData, undefined, 4) + "\n")
console.log("updated " + __dirname + "/package.json")

subProjects.forEach(projectName => {
    const packageFilePath = __dirname + "/" + projectName + "/package.json"
    const data = JSON.parse(fs.readFileSync(packageFilePath))
    data.version = newVersionString
    for (const key in data.peerDependencies) {
        if (key.startsWith("typedapi-")) {
            data.peerDependencies[key] = "^" + newVersionString
        }
    }
    fs.writeFileSync(packageFilePath, JSON.stringify(data, undefined, 4) + "\n")
    console.log("updated " + projectName + "/package.json")
})